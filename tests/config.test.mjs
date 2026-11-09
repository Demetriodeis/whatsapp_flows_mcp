import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlipConfig, MissingConfigError, toAuthorizationHeader } from "../dist/config/blipConfig.js";

test("normaliza a chave para o formato 'Key xxx'", () => {
  assert.equal(toAuthorizationHeader("abc"), "Key abc");
  assert.equal(toAuthorizationHeader("key  abc"), "Key abc");
  assert.equal(toAuthorizationHeader(" Key abc "), "Key abc");
});

test("monta a URL de commands a partir do contrato", () => {
  const config = loadBlipConfig({ BLIP_API_KEY: "abc", BLIP_CONTRACT_ID: "x" });
  assert.equal(config.commandsUrl, "https://x.http.msging.net/commands");
  assert.equal(config.flowsRecipient, "postmaster@wa.gw.msging.net");
});

test("exige BLIP_API_KEY", () => {
  assert.throws(() => loadBlipConfig({}), MissingConfigError);
});

test("overrides por requisição têm prioridade sobre o ambiente", () => {
  const env = { BLIP_API_KEY: "a", BLIP_COMMANDS_URL: "https://antigo/commands" };
  assert.equal(
    loadBlipConfig(env, { contractId: "novo" }).commandsUrl,
    "https://novo.http.msging.net/commands"
  );
  assert.equal(loadBlipConfig(env, { apiKey: "b" }).authorization, "Key b");
});
