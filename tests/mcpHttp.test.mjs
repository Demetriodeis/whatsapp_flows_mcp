import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../dist/transports/http/mcpHttpHandler.js";

const EXPECTED_TOOLS = [
  "build_flow_message",
  "create_flow",
  "create_flow_with_json",
  "delete_flow",
  "deprecate_flow",
  "download_flow_json",
  "get_flow",
  "get_flow_assets",
  "get_flow_json_example",
  "list_flows",
  "publish_flow",
  "update_flow_metadata",
  "upload_flow_json",
  "upload_public_key",
  "validate_flow_json",
];

async function callMcp(body, { env = {}, headers = {} } = {}) {
  const request = new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const response = await handleMcpRequest(request, env);
  return { status: response.status, json: await response.json() };
}

const rpc = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params });

test("initialize responde com os dados do servidor", async () => {
  const { status, json } = await callMcp(
    rpc(1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "t", version: "1" },
    })
  );
  assert.equal(status, 200);
  assert.equal(json.result.serverInfo.name, "whatsapp-flows-blip");
});

test("tools/list expõe todas as tools", async () => {
  const { json } = await callMcp(rpc(2, "tools/list"));
  assert.deepEqual(json.result.tools.map((tool) => tool.name).sort(), EXPECTED_TOOLS);
});

test("resources/read entrega a documentação de referência", async () => {
  const { json } = await callMcp(rpc(3, "resources/read", { uri: "blip://docs/commands" }));
  assert.match(json.result.contents[0].text, /whatsapp-flows\/publish/);
});

test("tool de API sem credenciais retorna erro amigável", async () => {
  const savedKey = process.env.BLIP_API_KEY;
  delete process.env.BLIP_API_KEY;
  try {
    const { json } = await callMcp(rpc(4, "tools/call", { name: "list_flows", arguments: {} }));
    assert.equal(json.result.isError, true);
    assert.match(json.result.content[0].text, /BLIP_API_KEY/);
  } finally {
    if (savedKey) process.env.BLIP_API_KEY = savedKey;
  }
});

test("publish_flow exige confirmação explícita", async () => {
  const { json } = await callMcp(rpc(5, "tools/call", { name: "publish_flow", arguments: { flow_id: "1" } }));
  assert.ok(json.error || json.result?.isError, "deveria rejeitar sem confirm=true");
});

test("MCP_AUTH_TOKEN protege o endpoint", async () => {
  const env = { MCP_AUTH_TOKEN: "segredo" };
  assert.equal((await callMcp(rpc(6, "tools/list"), { env })).status, 401);
  const authorized = await callMcp(rpc(7, "tools/list"), {
    env,
    headers: { Authorization: "Bearer segredo" },
  });
  assert.equal(authorized.status, 200);
});
