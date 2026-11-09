import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { handleMcpRequest } from "../httpHandler.js";

/**
 * Azure Function (modelo de programação v4) que expõe o servidor MCP via Streamable HTTP.
 * Endpoint: https://<app>.azurewebsites.net/api/mcp
 *
 * authLevel "function": exige a chave da função (?code=... ou header x-functions-key).
 * Troque para "anonymous" se preferir usar apenas MCP_AUTH_TOKEN.
 */
app.http("mcp", {
  route: "mcp",
  methods: ["POST", "GET", "DELETE"],
  authLevel: "function",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const headers = new Headers();
    request.headers.forEach((value, key) => headers.set(key, value));
    const body = request.method === "POST" ? await request.text() : undefined;

    const webRequest = new Request(request.url, { method: request.method, headers, body });
    try {
      const res = await handleMcpRequest(webRequest);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (resHeaders[k] = v));
      return { status: res.status, headers: resHeaders, body: await res.text() };
    } catch (err) {
      context.error("Erro no handler MCP", err);
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Erro interno" }, id: null }),
      };
    }
  },
});

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (): Promise<HttpResponseInit> => ({
    status: 200,
    jsonBody: { status: "ok", server: "whatsapp-flows-blip-mcp" },
  }),
});
