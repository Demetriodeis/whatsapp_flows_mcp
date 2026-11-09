import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateFlowJson } from "../dist/validation.js";

test("exemplos incluídos são válidos", () => {
  for (const f of readdirSync("examples").filter((x) => x.endsWith(".json"))) {
    const r = validateFlowJson(readFileSync(`examples/${f}`, "utf8"));
    assert.equal(r.valid, true, `${f}: ${JSON.stringify(r.errors)}`);
    assert.deepEqual(r.warnings, [], `${f}: ${JSON.stringify(r.warnings)}`);
  }
});

test("detecta erros comuns", () => {
  const r = validateFlowJson({
    version: "6.3",
    screens: [
      {
        id: "INICIO",
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextInput", name: "nome", label: "Nome" },
            { type: "Footer", label: "Ir", "on-click-action": { name: "navigate", next: { type: "screen", name: "NAO_EXISTE" } } },
            { type: "Footer", label: "Fim", "on-click-action": { name: "complete", payload: { x: "${form.inexistente}" } } },
          ],
        },
      },
      { id: "SUCCESS", layout: { type: "SingleColumnLayout", children: [] } },
    ],
  });
  assert.equal(r.valid, false);
  const msgs = r.errors.map((e) => e.message).join("\n");
  assert.match(msgs, /tela inexistente 'NAO_EXISTE'/);
  assert.match(msgs, /2 Footers/);
  assert.match(msgs, /'complete' só pode/);
  assert.match(msgs, /reservado/);
  assert.match(msgs, /terminal/);
  assert.ok(r.warnings.some((w) => w.message.includes("form.inexistente")));
});

test("data_exchange exige data_api_version e routing_model", () => {
  const r = validateFlowJson({
    version: "6.3",
    screens: [{
      id: "A", terminal: true,
      layout: { type: "SingleColumnLayout", children: [
        { type: "Footer", label: "x", "on-click-action": { name: "data_exchange", payload: {} } },
      ] },
    }],
  });
  assert.ok(r.errors.some((e) => e.path === "$.data_api_version"));
});

test("JSON com sintaxe inválida", () => {
  const r = validateFlowJson("{ invalido");
  assert.equal(r.valid, false);
});
