import { test } from "node:test";
import assert from "node:assert/strict";
import { botSettingPrefix, resolveBotCredentials } from "../dist/config/botRegistry.js";
import { handleBotMcpRequest } from "../dist/transports/http/mcpHttpHandler.js";

const BOT_ENV = {
  BLIP_API_KEY: "chave-fixa",
  BLIP_CONTRACT_ID: "contrato-fixo",
  BLIP_BOT_VALUE_DESIGN_API_KEY: "Key do-bot",
  BLIP_BOT_VALUE_DESIGN_CONTRACT_ID: "valuedesign",
};

const rpc = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params });

function callBot(alias, body, { env = BOT_ENV, query = "" } = {}) {
  const request = new Request(`http://localhost/api/mcp/b/${alias}${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
  return handleBotMcpRequest(request, alias, env);
}

test("alias vira prefixo de App Setting sem hífen", () => {
  assert.equal(botSettingPrefix("value-design"), "BLIP_BOT_VALUE_DESIGN_");
});

test("resolve credenciais só de bots completos e com alias válido", () => {
  assert.equal(resolveBotCredentials("value-design", BOT_ENV).contractId, "valuedesign");
  assert.equal(resolveBotCredentials("inexistente", BOT_ENV), undefined);
  assert.equal(resolveBotCredentials("../x", BOT_ENV), undefined);
  assert.equal(
    resolveBotCredentials("so-chave", { BLIP_BOT_SO_CHAVE_API_KEY: "k" }),
    undefined,
    "sem contrato/URL não é um bot válido"
  );
});

test("rota do bot usa a chave e o contrato do bot, não os fixos", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, authorization: init.headers.Authorization ?? init.headers.authorization });
    return new Response(JSON.stringify({ status: "success", resource: { items: [] } }));
  };
  try {
    const response = await callBot(
      "value-design",
      rpc(1, "tools/call", { name: "list_flows", arguments: {} })
    );
    assert.equal(response.status, 200);
    assert.equal(calls[0].url, "https://valuedesign.http.msging.net/commands");
    assert.equal(calls[0].authorization, "Key do-bot");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("alias desconhecido retorna 404", async () => {
  const response = await callBot("nao-existe", rpc(2, "tools/list"));
  assert.equal(response.status, 404);
});

test("MCP_AUTH_TOKEN pode ir em ?token= na rota do bot", async () => {
  const env = { ...BOT_ENV, MCP_AUTH_TOKEN: "segredo" };
  assert.equal((await callBot("value-design", rpc(3, "tools/list"), { env })).status, 401);
  const wrong = await callBot("value-design", rpc(4, "tools/list"), { env, query: "?token=errado" });
  assert.equal(wrong.status, 401);
  const ok = await callBot("value-design", rpc(5, "tools/list"), { env, query: "?code=x&token=segredo" });
  assert.equal(ok.status, 200);
});
