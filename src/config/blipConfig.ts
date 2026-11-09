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
  /**
   * Modo multi-contrato: ignora BLIP_API_KEY/BLIP_CONTRACT_ID/BLIP_COMMANDS_URL do ambiente
   * e exige que a chave e o contrato (ou a URL) venham na própria requisição.
   */
  requireRequestCredentials?: boolean;
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

/** Interpreta "true", "1", "yes", "sim" (sem diferenciar maiúsculas) como verdadeiro. */
export function isTruthyFlag(raw: string | undefined): boolean {
  return /^(true|1|yes|sim)$/i.test(raw?.trim() ?? "");
}

export function loadBlipConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: BlipConfigOverrides = {}
): BlipConfig {
  if (overrides.requireRequestCredentials) return loadFromRequestOnly(env, overrides);

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

function loadFromRequestOnly(env: NodeJS.ProcessEnv, overrides: BlipConfigOverrides): BlipConfig {
  const { apiKey, commandsUrl } = requireRequestCredentials(
    overrides.apiKey?.trim(),
    overrides.commandsUrl?.trim() || contractUrl(overrides.contractId)
  );

  return {
    authorization: toAuthorizationHeader(apiKey),
    commandsUrl,
    flowsRecipient: env.BLIP_FLOWS_TO?.trim() || DEFAULT_FLOWS_RECIPIENT,
    timeoutMs: parseTimeout(env.BLIP_TIMEOUT_MS),
  };
}

function contractUrl(contractId: string | undefined): string | undefined {
  return contractId?.trim() ? buildCommandsUrl(contractId) : undefined;
}

function requireRequestCredentials(
  apiKey: string | undefined,
  commandsUrl: string | undefined
): { apiKey: string; commandsUrl: string } {
  const missing: string[] = [];
  if (!apiKey) missing.push("X-Blip-Api-Key");
  if (!commandsUrl) missing.push("X-Blip-Contract-Id (ou X-Blip-Commands-Url)");
  if (missing.length) {
    throw new MissingConfigError(
      "Credenciais da Blip ausentes na requisição. Este servidor está em modo multi-contrato " +
        `(BLIP_REQUIRE_REQUEST_CREDENTIALS) e exige os headers: ${missing.join(", ")}.`
    );
  }
  return { apiKey: apiKey as string, commandsUrl: commandsUrl as string };
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
