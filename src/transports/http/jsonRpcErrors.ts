export const JSON_RPC_SERVER_ERROR = -32000;
export const JSON_RPC_INTERNAL_ERROR = -32603;

/** Resposta HTTP no formato de erro JSON-RPC, como esperado por clientes MCP. */
export function jsonRpcErrorResponse(
  status: number,
  message: string,
  code = JSON_RPC_SERVER_ERROR,
  headers: Record<string, string> = {}
): Response {
  const body = JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null });
  return new Response(body, { status, headers: { "Content-Type": "application/json", ...headers } });
}
