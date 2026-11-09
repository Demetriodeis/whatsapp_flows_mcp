import type { JsonObject } from "../../shared/json.js";
import { MAX_FLOW_JSON_BYTES, VERSION_PATTERN } from "../constants.js";
import type { IssueCollector } from "../issueCollector.js";

export function measureSize(flow: JsonObject): number {
  return Buffer.byteLength(JSON.stringify(flow), "utf8");
}

export function validateSize(sizeBytes: number, issues: IssueCollector): void {
  if (sizeBytes > MAX_FLOW_JSON_BYTES) {
    issues.error("$", `Flow JSON com ${sizeBytes} bytes excede o limite de 10 MB.`);
  }
}

export function validateVersion(flow: JsonObject, issues: IssueCollector): void {
  const { version } = flow;
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    issues.error("$.version", "Campo 'version' obrigatório, string no formato 'X.Y' (ex.: \"6.3\").");
  }
}

/** Retorna as telas se `screens` for um array não vazio; caso contrário registra erro. */
export function getScreens(flow: JsonObject, issues: IssueCollector): unknown[] | undefined {
  const { screens } = flow;
  if (Array.isArray(screens) && screens.length > 0) return screens;
  issues.error("$.screens", "Campo 'screens' obrigatório e deve conter ao menos uma tela.");
  return undefined;
}
