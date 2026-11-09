import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isTruthyFlag, type BlipConfigOverrides } from "../../config/blipConfig.js";
import { resolveBotCredentials } from "../../config/botRegistry.js";
import { createServer } from "../../mcp/createServer.js";
import { isAuthorized } from "./auth.js";
import { readBlipOverrides } from "./blipHeaders.js";
import { jsonRpcErrorResponse } from "./jsonRpcErrors.js";

const UNAUTHORIZED_MESSAGE = "Não autorizado: envie 'Authorization: Bearer <MCP_AUTH_TOKEN>'.";

/**
 * Handler MCP Streamable HTTP, sem estado, independente de plataforma (Request -> Response).
 * Cada requisição cria um servidor novo: adequado para Azure Functions/serverless.
 * Credenciais da Blip: App Settings ou headers X-Blip-* (ver BLIP_REQUIRE_REQUEST_CREDENTIALS).
 */
export async function handleMcpRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Promise<Response> {
  if (!isAuthorized(request, env.MCP_AUTH_TOKEN?.trim())) {
    return jsonRpcErrorResponse(401, UNAUTHORIZED_MESSAGE);
  }
  return serveMcp(request, {
    ...readBlipOverrides(request.headers),
    requireRequestCredentials: isTruthyFlag(env.BLIP_REQUIRE_REQUEST_CREDENTIALS),
  });
}

/**
 * Variante para clientes que só aceitam uma URL (ex.: conectores personalizados do Claude):
 * as credenciais vêm do bot cadastrado com `alias` nas App Settings (BLIP_BOT_<ALIAS>_*).
 * Como esses clientes não enviam headers, o MCP_AUTH_TOKEN também pode ir em `?token=`.
 */
export async function handleBotMcpRequest(
  request: Request,
  alias: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<Response> {
  if (!isAuthorized(request, env.MCP_AUTH_TOKEN?.trim(), { allowQueryToken: true })) {
    return jsonRpcErrorResponse(401, "Não autorizado: informe ?token=<MCP_AUTH_TOKEN> na URL.");
  }
  const credentials = resolveBotCredentials(alias, env);
  if (!credentials) {
    return jsonRpcErrorResponse(
      404,
      `Bot '${alias}' não cadastrado. Defina as App Settings BLIP_BOT_<ALIAS>_API_KEY e ` +
        "BLIP_BOT_<ALIAS>_CONTRACT_ID."
    );
  }
  return serveMcp(request, credentials);
}

async function serveMcp(request: Request, configOverrides: BlipConfigOverrides): Promise<Response> {
  if (request.method !== "POST") {
    // Sem estado: não há stream SSE iniciado pelo servidor nem sessões para encerrar.
    return jsonRpcErrorResponse(405, "Method not allowed. Use POST.", undefined, { Allow: "POST" });
  }

  const server = createServer({ configOverrides });
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
