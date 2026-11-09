/**
 * Configuração de acesso à API de Commands da Blip.
 *
 * Fonte padrão: variáveis de ambiente. No modo HTTP, valores podem ser
 * sobrepostos por requisição (ver {@link BlipConfigOverrides}).
 */

export const DEFAULT_FLOWS_RECIPIENT = "postmaster@wa.gw.msging.net";
export const DEFAULT_TIMEOUT_MS = 60_000;
const GLOBAL_COMMANDS_URL = "https://http.msging.net/commands";

export interface BlipConfig {
  /** Valor do header Authorization, sempre no formato "Key xxx". */
  authorization: string;
  commandsUrl: string;
  flowsRecipient: string;
  timeoutMs: number;
}

export interface BlipConfigOverrides {
  apiKey?: string;
  contractId?: string;
  commandsUrl?: string;
}

export class MissingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingConfigError";
  }
}

/** Aceita "Key xxx", "key xxx" ou apenas "xxx" e devolve "Key xxx". */
export function toAuthorizationHeader(apiKey: string): string {
  const keyWithoutPrefix = apiKey.trim().replace(/^key\s+/i, "");
  return `Key ${keyWithoutPrefix}`;
}

export function buildCommandsUrl(contractId: string): string {
  return `https://${contractId.trim()}.http.msging.net/commands`;
}

export function loadBlipConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: BlipConfigOverrides = {}
): BlipConfig {
  const apiKey = overrides.apiKey ?? env.BLIP_API_KEY;
  if (!apiKey?.trim()) {
    throw new MissingConfigError(
      "Variável BLIP_API_KEY não definida. Informe a chave do bot (ex.: 'Key abc123...')."
    );
  }

  return {
    authorization: toAuthorizationHeader(apiKey),
    commandsUrl: resolveCommandsUrl(env, overrides),
    flowsRecipient: env.BLIP_FLOWS_TO?.trim() || DEFAULT_FLOWS_RECIPIENT,
    timeoutMs: parseTimeout(env.BLIP_TIMEOUT_MS),
  };
}

/** Prioridade: override de URL > override de contrato > env de URL > env de contrato > URL global. */
function resolveCommandsUrl(env: NodeJS.ProcessEnv, overrides: BlipConfigOverrides): string {
  if (overrides.commandsUrl?.trim()) return overrides.commandsUrl.trim();
  if (overrides.contractId?.trim()) return buildCommandsUrl(overrides.contractId);
  if (env.BLIP_COMMANDS_URL?.trim()) return env.BLIP_COMMANDS_URL.trim();
  if (env.BLIP_CONTRACT_ID?.trim()) return buildCommandsUrl(env.BLIP_CONTRACT_ID);
  return GLOBAL_COMMANDS_URL;
}

function parseTimeout(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
