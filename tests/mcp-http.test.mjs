import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../dist/httpHandler.js";

const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };

async function rpc(body, env = {}, extraHeaders = {}) {
  const res = await handleMcpRequest(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: { ...headers, ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env
  );
  return { status: res.status, json: res.status === 202 ? null : await res.json() };
}

test("initialize + tools/list via HTTP", async () => {
  const init = await rpc({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } },
  });
  assert.equal(init.status, 200);
  assert.equal(init.json.result.serverInfo.name, "whatsapp-flows-blip");

  const list = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const names = list.json.result.tools.map((t) => t.name).sort();
  for (const n of ["create_flow", "list_flows", "get_flow", "update_flow_metadata", "upload_flow_json",
    "publish_flow", "deprecate_flow", "delete_flow", "upload_public_key", "get_flow_assets",
    "download_flow_json", "create_flow_with_json", "validate_flow_json", "build_flow_message",
    "get_flow_json_example"]) {
    assert.ok(names.includes(n), `tool ausente: ${n}`);
  }
});

test("tools/call build_flow_message", async () => {
  const r = await rpc({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "build_flow_message", arguments: { flow_id: "999", first_screen: "INICIO", cta: "Abrir", body: "Olá", draft_mode: true } },
  });
  const text = r.json.result.content[0].text;
  const msg = JSON.parse(text.slice(text.indexOf("{")));
  assert.equal(msg.interactive.type, "flow");
  assert.equal(msg.interactive.action.parameters.flow_id, "999");
  assert.equal(msg.interactive.action.parameters.mode, "draft");
  assert.equal(msg.interactive.action.parameters.flow_action_payload.screen, "INICIO");
});

test("tool de API sem credenciais retorna erro amigável", async () => {
  const saved = process.env.BLIP_API_KEY;
  delete process.env.BLIP_API_KEY;
  const r = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "list_flows", arguments: {} } });
  if (saved) process.env.BLIP_API_KEY = saved;
  assert.equal(r.json.result.isError, true);
  assert.match(r.json.result.content[0].text, /BLIP_API_KEY/);
});

test("MCP_AUTH_TOKEN protege o endpoint", async () => {
  const body = { jsonrpc: "2.0", id: 5, method: "tools/list", params: {} };
  assert.equal((await rpc(body, { MCP_AUTH_TOKEN: "segredo" })).status, 401);
  assert.equal((await rpc(body, { MCP_AUTH_TOKEN: "segredo" }, { Authorization: "Bearer segredo" })).status, 200);
});
