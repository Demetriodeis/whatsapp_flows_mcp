import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "../../mcp/createServer.js";
import { isAuthorized } from "./auth.js";
import { readBlipOverrides } from "./blipHeaders.js";
import { jsonRpcErrorResponse } from "./jsonRpcErrors.js";

/**
 * Handler MCP Streamable HTTP, sem estado, independente de plataforma (Request -> Response).
 * Cada requisição cria um servidor novo: adequado para Azure Functions/serverless.
 */
export async function handleMcpRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Promise<Response> {
  if (!isAuthorized(request, env.MCP_AUTH_TOKEN?.trim())) {
    return jsonRpcErrorResponse(401, "Não autorizado: envie 'Authorization: Bearer <MCP_AUTH_TOKEN>'.");
  }
  if (request.method !== "POST") {
    // Sem estado: não há stream SSE iniciado pelo servidor nem sessões para encerrar.
    return jsonRpcErrorResponse(405, "Method not allowed. Use POST.", undefined, { Allow: "POST" });
  }

  const server = createServer({ configOverrides: readBlipOverrides(request.headers) });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await server.close().catch(() => undefined);
  }
}
