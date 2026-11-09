import { isJsonObject, type JsonObject } from "../../shared/json.js";
import { ACTION_PROPERTIES, FLOW_ACTIONS } from "../constants.js";
import type { IssueCollector } from "../issueCollector.js";
import type { ScreenContext } from "../screenContext.js";

/** Valida todas as ações (`on-click-action`, `on-select-action`...) de um componente. */
export function validateComponentActions(
  component: JsonObject,
  componentPath: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  for (const property of ACTION_PROPERTIES) {
    const action = component[property];
    if (isJsonObject(action)) {
      validateAction(action, `${componentPath}.${property}`, screen, issues);
    }
  }
}

function validateAction(
  action: JsonObject,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  const { name } = action;
  if (typeof name !== "string" || !FLOW_ACTIONS.has(name)) {
    issues.error(path, `Ação inválida '${String(name)}'. Use: ${[...FLOW_ACTIONS].join(", ")}.`);
    return;
  }

  if (name === "complete") screen.usesCompleteAction = true;
  if (name === "data_exchange") screen.usesDataExchange = true;
  if (name === "navigate") registerNavigateTarget(action, path, screen, issues);
}

function registerNavigateTarget(
  action: JsonObject,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  const { next } = action;
  if (!isJsonObject(next) || typeof next.name !== "string") {
    issues.error(path, "Ação 'navigate' exige next: { type: 'screen', name: '<ID_DA_TELA>' }.");
    return;
  }
  screen.navigateTargets.push({ name: next.name, path: `${path}.next.name` });
}
