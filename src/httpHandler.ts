import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { ConfigOverrides } from "./config.js";
import { createServer } from "./server.js";

/**
 * Handler MCP (Streamable HTTP, sem estado) independente de plataforma: recebe um Request
 * padrão Web e devolve um Response. Usado pela Azure Function, mas serve para qualquer runtime.
 *
 * Autenticação (opcional): se MCP_AUTH_TOKEN estiver definido, exige "Authorization: Bearer <token>".
 * Credenciais Blip por requisição (opcional, multi-bot): headers X-Blip-Api-Key,
 * X-Blip-Contract-Id e X-Blip-Commands-Url sobrepõem as variáveis de ambiente.
 */
export async function handleMcpRequest(req: Request, env: NodeJS.ProcessEnv = process.env): Promise<Response> {
  const expected = env.MCP_AUTH_TOKEN?.trim();
  if (expected) {
    const header = req.headers.get("authorization") ?? "";
    const token = header.replace(/^Bearer\s+/i, "");
    if (!safeEqual(token, expected)) {
      return jsonRpcError(401, "Não autorizado: envie 'Authorization: Bearer <MCP_AUTH_TOKEN>'.");
    }
  }

  if (req.method === "GET" || req.method === "DELETE") {
    // Modo sem estado: não há stream SSE de servidor nem sessões para encerrar.
    return jsonRpcError(405, "Method not allowed. Use POST.", { Allow: "POST" });
  }

  const overrides: ConfigOverrides = {
    apiKey: req.headers.get("x-blip-api-key") ?? undefined,
    contractId: req.headers.get("x-blip-contract-id") ?? undefined,
    commandsUrl: req.headers.get("x-blip-commands-url") ?? undefined,
  };

  const server = createServer({ configOverrides: overrides });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: adequado para Functions/serverless
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(req);
  } finally {
    // libera recursos após a resposta JSON ter sido montada
    void transport.close().catch(() => undefined);
    void server.close().catch(() => undefined);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function jsonRpcError(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }),
    { status, headers: { "Content-Type": "application/json", ...headers } }
  );
}
