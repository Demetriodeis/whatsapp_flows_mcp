import { test } from "node:test";
import assert from "node:assert/strict";
import { BlipClient, BlipCommandError } from "../dist/blipClient.js";
import { loadConfig } from "../dist/config.js";
import { WhatsAppFlowsApi } from "../dist/flowsApi.js";

function mock(response = { status: "success", resource: { id: "123" } }, httpStatus = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(response), { status: httpStatus });
  };
  const cfg = loadConfig({ BLIP_API_KEY: "abc", BLIP_CONTRACT_ID: "meu-contrato" });
  return { api: new WhatsAppFlowsApi(new BlipClient(cfg, fetchImpl)), calls };
}

test("config monta URL e normaliza chave", () => {
  const c = loadConfig({ BLIP_API_KEY: "abc", BLIP_CONTRACT_ID: "x" });
  assert.equal(c.apiKey, "Key abc");
  assert.equal(c.commandsUrl, "https://x.http.msging.net/commands");
  assert.equal(loadConfig({ BLIP_API_KEY: "key  abc" }).apiKey, "Key abc");
  assert.throws(() => loadConfig({}));
  const o = loadConfig({ BLIP_API_KEY: "a", BLIP_COMMANDS_URL: "https://old/commands" }, { contractId: "novo" });
  assert.equal(o.commandsUrl, "https://novo.http.msging.net/commands");
});

test("commands seguem a collection da Blip", async () => {
  const { api, calls } = mock();
  await api.create("Meu flow", ["OTHER"]);
  await api.list();
  await api.get("1");
  await api.update("1", { name: "n", categories: ["OTHER", "SIGN_UP"] });
  await api.uploadFlowJson("1", { version: "6.3", screens: [] });
  await api.uploadPublicKey("PEM");
  await api.publish("1");
  await api.assets("1");
  await api.deprecate("1");
  await api.delete("1");

  const summary = calls.map((c) => [c.body.method, c.body.uri]);
  assert.deepEqual(summary, [
    ["set", "/whatsapp-flows"],
    ["get", "/whatsapp-flows/"],
    ["get", "/whatsapp-flows/1"],
    ["set", "/whatsapp-flows/1"],
    ["set", "/whatsapp-flows/flow-json/1"],
    ["set", "/whatsapp-flows/public-key/upload"],
    ["get", "/whatsapp-flows/publish/1"],
    ["get", "/whatsapp-flows/assets/1"],
    ["get", "/whatsapp-flows/deprecate/1"],
    ["delete", "/whatsapp-flows/1"],
  ]);
  for (const c of calls) {
    assert.equal(c.url, "https://meu-contrato.http.msging.net/commands");
    assert.equal(c.headers.Authorization, "Key abc");
    assert.equal(c.body.to, "postmaster@wa.gw.msging.net");
    assert.ok(c.body.id);
  }
  assert.deepEqual(calls[0].body.resource, { name: "Meu flow", categories: ["OTHER"] });
  assert.equal(calls[0].body.type, "application/json");
  assert.deepEqual(calls[5].body.resource, { business_public_key: "PEM" });
});

test("status failure vira BlipCommandError", async () => {
  const { api } = mock({ status: "failure", reason: { code: 67, description: "Flow not found" } });
  await assert.rejects(api.get("x"), (e) => e instanceof BlipCommandError && /Flow not found/.test(e.message));
});

test("HTTP 401 vira BlipCommandError com dica", async () => {
  const { api } = mock({}, 401);
  await assert.rejects(api.list(), /BLIP_API_KEY/);
});
