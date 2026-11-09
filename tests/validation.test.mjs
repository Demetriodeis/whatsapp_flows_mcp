import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateFlowJson } from "../dist/validation/index.js";

const screen = (id, children, extra = {}) => ({
  id,
  layout: { type: "SingleColumnLayout", children },
  ...extra,
});
const footer = (action) => ({ type: "Footer", label: "Ir", "on-click-action": action });
const messages = (issues) => issues.map((issue) => issue.message).join("\n");

test("exemplos incluídos são válidos e sem avisos", () => {
  for (const file of readdirSync("examples").filter((name) => name.endsWith(".json"))) {
    const result = validateFlowJson(readFileSync(`examples/${file}`, "utf8"));
    assert.equal(result.valid, true, `${file}: ${messages(result.errors)}`);
    assert.deepEqual(result.warnings, [], `${file}: ${messages(result.warnings)}`);
  }
});

test("detecta erros estruturais e de navegação", () => {
  const result = validateFlowJson({
    version: "6.3",
    screens: [
      screen("INICIO", [
        { type: "TextInput", name: "nome", label: "Nome" },
        footer({ name: "navigate", next: { type: "screen", name: "NAO_EXISTE" } }),
        footer({ name: "complete", payload: { x: "${form.inexistente}" } }),
      ]),
      screen("SUCCESS", []),
    ],
  });

  assert.equal(result.valid, false);
  const errors = messages(result.errors);
  assert.match(errors, /tela inexistente 'NAO_EXISTE'/);
  assert.match(errors, /2 Footers/);
  assert.match(errors, /'complete' só pode/);
  assert.match(errors, /reservado/);
  assert.match(errors, /terminal/);
  assert.match(messages(result.warnings), /form\.inexistente/);
});

test("valida opções de escolha duplicadas", () => {
  const result = validateFlowJson({
    version: "6.3",
    screens: [
      screen(
        "A",
        [
          {
            type: "Dropdown",
            name: "d",
            label: "x",
            "data-source": [
              { id: "1", title: "a" },
              { id: "1", title: "b" },
            ],
          },
          footer({ name: "complete", payload: {} }),
        ],
        { terminal: true }
      ),
    ],
  });
  assert.match(messages(result.errors), /duplicado '1'/);
});

test("data_exchange exige data_api_version e routing_model", () => {
  const result = validateFlowJson({
    version: "6.3",
    screens: [screen("A", [footer({ name: "data_exchange", payload: {} })], { terminal: true })],
  });
  assert.ok(result.errors.some((issue) => issue.path === "$.data_api_version"));
  assert.equal(result.summary.usesDataExchange, true);
});

test("routing_model referenciando telas inexistentes", () => {
  const result = validateFlowJson({
    version: "6.3",
    data_api_version: "3.0",
    routing_model: { A: ["B"] },
    screens: [screen("A", [footer({ name: "complete", payload: {} })], { terminal: true })],
  });
  assert.match(messages(result.errors), /Destino 'B' não existe/);
});

test("JSON com sintaxe inválida", () => {
  const result = validateFlowJson("{ invalido");
  assert.equal(result.valid, false);
  assert.match(messages(result.errors), /sintaxe/);
});
