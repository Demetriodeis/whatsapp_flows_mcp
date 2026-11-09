import type { BlipConfigOverrides } from "../../config/blipConfig.js";

/** Headers opcionais que permitem usar credenciais Blip diferentes por requisição (multi-bot). */
export const BLIP_OVERRIDE_HEADERS = {
  apiKey: "x-blip-api-key",
  contractId: "x-blip-contract-id",
  commandsUrl: "x-blip-commands-url",
} as const;

export function readBlipOverrides(headers: Headers): BlipConfigOverrides {
  return {
    apiKey: headers.get(BLIP_OVERRIDE_HEADERS.apiKey) ?? undefined,
    contractId: headers.get(BLIP_OVERRIDE_HEADERS.contractId) ?? undefined,
    commandsUrl: headers.get(BLIP_OVERRIDE_HEADERS.commandsUrl) ?? undefined,
  };
}
