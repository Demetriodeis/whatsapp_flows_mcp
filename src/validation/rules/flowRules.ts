import { isJsonObject, type JsonObject } from "../../shared/json.js";
import type { IssueCollector } from "../issueCollector.js";
import type { ScreenContext } from "../screenContext.js";

/** Regras que dependem do flow inteiro (todas as telas já analisadas). */

export function validateNavigationTargets(
  screens: ScreenContext[],
  screenIds: Set<string>,
  issues: IssueCollector
): void {
  for (const screen of screens) {
    for (const target of screen.navigateTargets) {
      if (!screenIds.has(target.name)) {
        issues.error(target.path, `navigate aponta para tela inexistente '${target.name}'.`);
      }
    }
  }
}

export function validateTerminalScreenExists(terminalScreens: string[], issues: IssueCollector): void {
  if (terminalScreens.length === 0) {
    issues.error("$.screens", 'O flow precisa de ao menos uma tela com "terminal": true.');
  }
}

/** Flows com endpoint precisam de `data_api_version` e `routing_model`. */
export function validateEndpointSettings(
  flow: JsonObject,
  usesDataExchange: boolean,
  issues: IssueCollector
): void {
  const { data_api_version: dataApiVersion, routing_model: routingModel } = flow;

  if (dataApiVersion !== undefined && typeof dataApiVersion !== "string") {
    issues.error("$.data_api_version", "'data_api_version' deve ser string (ex.: \"3.0\").");
  }
  if (usesDataExchange && dataApiVersion === undefined) {
    issues.error(
      "$.data_api_version",
      "Flows com ação 'data_exchange' exigem 'data_api_version' (ex.: \"3.0\") e endpoint configurado."
    );
  }
  if (dataApiVersion !== undefined && routingModel === undefined) {
    issues.error("$.routing_model", "Flows com 'data_api_version' exigem 'routing_model'.");
  }
}

/** `routing_model`: { "TELA_ORIGEM": ["TELA_DESTINO", ...] } — todas as telas devem existir. */
export function validateRoutingModel(flow: JsonObject, screenIds: Set<string>, issues: IssueCollector): void {
  const { routing_model: routingModel } = flow;
  if (routingModel === undefined) return;
  if (!isJsonObject(routingModel)) {
    issues.error("$.routing_model", "'routing_model' deve ser um objeto.");
    return;
  }

  for (const [source, destinations] of Object.entries(routingModel)) {
    const path = `$.routing_model.${source}`;
    if (!screenIds.has(source)) issues.error(path, `Tela '${source}' não existe.`);
    if (!Array.isArray(destinations)) {
      issues.error(path, "Valor deve ser array de ids de tela.");
      continue;
    }
    for (const destination of destinations) {
      if (typeof destination !== "string" || !screenIds.has(destination)) {
        issues.error(path, `Destino '${String(destination)}' não existe.`);
      }
    }
  }
}
