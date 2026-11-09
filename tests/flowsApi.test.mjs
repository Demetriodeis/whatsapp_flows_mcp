import { test } from "node:test";
import assert from "node:assert/strict";
import { BlipCommandError } from "../dist/blip/errors.js";
import { createMockedFlowsApi } from "./helpers/mockFetch.mjs";

test("commands seguem a collection 'WA Flows no Blip'", async () => {
  const { api, calls } = createMockedFlowsApi();
  await api.create("Meu flow", ["OTHER"]);
  await api.list();
  await api.get("1");
  await api.updateMetadata("1", { name: "n", categories: ["OTHER", "SIGN_UP"] });
  await api.uploadFlowJson("1", { version: "6.3", screens: [] });
  await api.uploadPublicKey("PEM");
  await api.publish("1");
  await api.getAssets("1");
  await api.deprecate("1");
  await api.delete("1");

  assert.deepEqual(
    calls.map(({ body }) => [body.method, body.uri]),
    [
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
    ]
  );
});

test("envia URL, headers e envelope LIME corretos", async () => {
  const { api, calls } = createMockedFlowsApi();
  await api.create("Meu flow", ["OTHER"]);
  await api.list();

  const [create, list] = calls;
  assert.equal(create.url, "https://meu-contrato.http.msging.net/commands");
  assert.equal(create.headers.Authorization, "Key abc");
  assert.equal(create.body.to, "postmaster@wa.gw.msging.net");
  assert.ok(create.body.id);
  assert.equal(create.body.type, "application/json");
  assert.deepEqual(create.body.resource, { name: "Meu flow", categories: ["OTHER"] });
  assert.equal(list.body.type, undefined, "commands 'get' não enviam type/resource");
});

test("status 'failure' vira BlipCommandError com a descrição", async () => {
  const { api } = createMockedFlowsApi({
    status: "failure",
    reason: { code: 67, description: "Flow not found" },
  });
  await assert.rejects(
    api.get("x"),
    (error) => error instanceof BlipCommandError && /Flow not found/.test(error.message)
  );
});

test("HTTP 401 vira BlipCommandError com dica de credenciais", async () => {
  const { api } = createMockedFlowsApi({}, 401);
  await assert.rejects(api.list(), /BLIP_API_KEY/);
});

test("flow_id vazio é rejeitado antes da chamada", async () => {
  const { api, calls } = createMockedFlowsApi();
  await assert.rejects(api.get("  "), /flow_id/);
  assert.equal(calls.length, 0);
});
