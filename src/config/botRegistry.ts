import type { BlipConfigOverrides } from "./blipConfig.js";

/**
 * Registro de bots por alias, lido das variáveis de ambiente (App Settings do Azure).
 *
 * Para cada bot, defina (alias "valuedesign" como exemplo):
 *   BLIP_BOT_VALUEDESIGN_API_KEY      = Key xxxx          (obrigatório)
 *   BLIP_BOT_VALUEDESIGN_CONTRACT_ID  = valuedesign       (ou BLIP_BOT_VALUEDESIGN_COMMANDS_URL)
 *
 * Usado por clientes que só aceitam uma URL (ex.: conectores personalizados do Claude),
 * que não conseguem enviar os headers X-Blip-*. A chave nunca trafega na URL: só o alias.
 */

const BOT_PREFIX = "BLIP_BOT_";
const ALIAS_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function isValidBotAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}

/** "value-design" -> "BLIP_BOT_VALUE_DESIGN_" (nomes de App Settings não aceitam hífen no Linux). */
export function botSettingPrefix(alias: string): string {
  return `${BOT_PREFIX}${alias.toUpperCase().replace(/-/g, "_")}_`;
}

/**
 * Credenciais do bot com o alias informado, ou `undefined` se o alias não existir
 * (ou estiver incompleto: sem chave ou sem contrato/URL).
 */
export function resolveBotCredentials(
  alias: string,
  env: NodeJS.ProcessEnv = process.env
): BlipConfigOverrides | undefined {
  if (!isValidBotAlias(alias)) return undefined;

  const prefix = botSettingPrefix(alias);
  const apiKey = env[`${prefix}API_KEY`]?.trim();
  const contractId = env[`${prefix}CONTRACT_ID`]?.trim();
  const commandsUrl = env[`${prefix}COMMANDS_URL`]?.trim();
  if (!apiKey || (!contractId && !commandsUrl)) return undefined;

  return {
    apiKey,
    contractId: contractId || undefined,
    commandsUrl: commandsUrl || undefined,
    requireRequestCredentials: true,
  };
}
