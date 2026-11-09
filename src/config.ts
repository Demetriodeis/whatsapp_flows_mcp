export interface BlipConfig {
  apiKey: string;
  commandsUrl: string;
  flowsTo: string;
  timeoutMs: number;
}

export const DEFAULT_FLOWS_TO = "postmaster@wa.gw.msging.net";

/** Normaliza a chave: aceita "Key xxx" ou apenas "xxx". */
export function normalizeApiKey(raw: string): string {
  const trimmed = raw.trim();
  return /^key\s+/i.test(trimmed) ? `Key ${trimmed.replace(/^key\s+/i, "")}` : `Key ${trimmed}`;
}

/** Overrides opcionais por requisição (ex.: headers HTTP no modo remoto). */
export interface ConfigOverrides {
  apiKey?: string;
  contractId?: string;
  commandsUrl?: string;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: ConfigOverrides = {}
): BlipConfig {
  env = {
    ...env,
    ...(overrides.apiKey ? { BLIP_API_KEY: overrides.apiKey } : {}),
    ...(overrides.contractId ? { BLIP_CONTRACT_ID: overrides.contractId, BLIP_COMMANDS_URL: "" } : {}),
    ...(overrides.commandsUrl ? { BLIP_COMMANDS_URL: overrides.commandsUrl } : {}),
  };
  const rawKey = env.BLIP_API_KEY ?? env.BLIP_AUTHORIZATION;
  if (!rawKey) {
    throw new Error(
      "Variável BLIP_API_KEY não definida. Informe a chave do bot (ex.: 'Key abc123...')."
    );
  }

  let commandsUrl = env.BLIP_COMMANDS_URL?.trim();
  if (!commandsUrl) {
    const contract = env.BLIP_CONTRACT_ID?.trim();
    commandsUrl = contract
      ? `https://${contract}.http.msging.net/commands`
      : "https://http.msging.net/commands";
  }

  const timeoutMs = Number(env.BLIP_TIMEOUT_MS ?? 60000);

  return {
    apiKey: normalizeApiKey(rawKey),
    commandsUrl,
    flowsTo: env.BLIP_FLOWS_TO?.trim() || DEFAULT_FLOWS_TO,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000,
  };
}
