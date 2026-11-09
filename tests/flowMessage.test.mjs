import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFlowMessage } from "../dist/flows/flowMessage.js";
import { extractFlowId, findDownloadUrl } from "../dist/flows/responseParsers.js";

test("gera a mensagem interativa no formato do Builder", () => {
  const message = buildFlowMessage({
    flowId: "999",
    firstScreen: "INICIO",
    cta: "Abrir",
    body: "Olá",
    header: "Título",
    draftMode: true,
    flowToken: "token",
  });
  assert.equal(message.type, "interactive");
  assert.equal(message.interactive.type, "flow");
  assert.deepEqual(message.interactive.header, { type: "text", text: "Título" });
  assert.deepEqual(message.interactive.action.parameters, {
    flow_message_version: "3",
    flow_token: "token",
    flow_id: "999",
    flow_cta: "Abrir",
    flow_action: "navigate",
    mode: "draft",
    flow_action_payload: { screen: "INICIO" },
  });
});

test("valida limites e tela inicial", () => {
  assert.throws(
    () => buildFlowMessage({ flowId: "1", cta: "x".repeat(21), body: "b", firstScreen: "A" }),
    /cta/
  );
  assert.throws(() => buildFlowMessage({ flowId: "1", cta: "ok", body: "b" }), /first_screen/);
});

test("extrai flow_id e download_url das respostas", () => {
  assert.equal(extractFlowId({ id: 123 }), "123");
  assert.equal(extractFlowId(undefined), undefined);
  assert.equal(
    findDownloadUrl({ data: [{ asset_type: "FLOW_JSON", download_url: "https://x" }] }),
    "https://x"
  );
  assert.equal(findDownloadUrl({ data: [] }), undefined);
});
