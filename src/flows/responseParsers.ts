import { isJsonObject } from "../shared/json.js";

const FLOW_ID_KEYS = ["id", "flowId", "flow_id"];
const DOWNLOAD_URL_KEYS = ["download_url", "downloadUrl"];

/** Extrai o ID do flow da resposta do command de criação. */
export function extractFlowId(resource: unknown): string | undefined {
  if (!isJsonObject(resource)) return undefined;
  for (const key of FLOW_ID_KEYS) {
    const value = resource[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return undefined;
}

/** Procura, em qualquer profundidade, a URL de download do Flow JSON na resposta de assets. */
export function findDownloadUrl(node: unknown): string | undefined {
  if (Array.isArray(node)) {
    for (const item of node) {
      const url = findDownloadUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (!isJsonObject(node)) return undefined;

  for (const key of DOWNLOAD_URL_KEYS) {
    if (typeof node[key] === "string") return node[key] as string;
  }
  return findDownloadUrl(Object.values(node));
}
