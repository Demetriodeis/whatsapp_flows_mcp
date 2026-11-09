import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { SERVER_NAME } from "../../mcp/serverInfo.js";
import { JSON_RPC_INTERNAL_ERROR } from "../http/jsonRpcErrors.js";
import { handleBotMcpRequest, handleMcpRequest } from "../http/mcpHttpHandler.js";

/**
 * Azure Functions (modelo de programação v4).
 *   POST /api/mcp           -> servidor MCP (Streamable HTTP)
 *   POST /api/mcp/b/{alias} -> servidor MCP com as credenciais do bot cadastrado (conectores do Claude)
 *   GET  /api/health  -> health check
 *
 * authLevel "function": exige a chave da função (?code=... ou header x-functions-key).
 * Troque para "anonymous" se preferir proteger apenas com MCP_AUTH_TOKEN.
 */
app.http("mcp", {
  route: "mcp",
  methods: ["POST", "GET", "DELETE"],
  authLevel: "function",
  handler: mcpFunction,
});

app.http("mcp-bot", {
  route: "mcp/b/{alias}",
  methods: ["POST", "GET", "DELETE"],
  authLevel: "function",
  handler: (request, context) =>
    runMcp(context, async () => handleBotMcpRequest(await toWebRequest(request), request.params.alias ?? "")),
});

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, jsonBody: { status: "ok", server: SERVER_NAME } }),
});

function mcpFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return runMcp(context, async () => handleMcpRequest(await toWebRequest(request)));
}

async function runMcp(
  context: InvocationContext,
  handle: () => Promise<Response>
): Promise<HttpResponseInit> {
  try {
    return await toAzureResponse(await handle());
  } catch (error) {
    context.error("Erro no handler MCP", error);
    return {
      status: 500,
      jsonBody: {
        jsonrpc: "2.0",
        error: { code: JSON_RPC_INTERNAL_ERROR, message: "Erro interno" },
        id: null,
      },
    };
  }
}

async function toWebRequest(request: HttpRequest): Promise<Request> {
  const headers = new Headers();
  request.headers.forEach((value, name) => headers.set(name, value));
  const body = request.method === "POST" ? await request.text() : undefined;
  return new Request(request.url, { method: request.method, headers, body });
}

async function toAzureResponse(response: Response): Promise<HttpResponseInit> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => (headers[name] = value));
  return { status: response.status, headers, body: await response.text() };
}
