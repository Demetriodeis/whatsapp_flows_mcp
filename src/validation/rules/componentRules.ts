import { isJsonObject, type JsonObject } from "../../shared/json.js";
import { CHOICE_COMPONENTS, KNOWN_COMPONENTS, MAX_IMAGE_BYTES } from "../constants.js";
import type { IssueCollector } from "../issueCollector.js";
import type { ScreenContext } from "../screenContext.js";
import { validateComponentActions } from "./actionRules.js";

/** Percorre recursivamente a árvore de componentes (children, If/then/else, Switch/cases). */
export function validateComponents(
  children: unknown,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  if (!Array.isArray(children)) return;
  children.forEach((child, index) => validateComponent(child, `${path}[${index}]`, screen, issues));
}

function validateComponent(
  component: unknown,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  if (!isJsonObject(component)) {
    issues.error(path, "Componente deve ser um objeto.");
    return;
  }
  const { type } = component;
  if (typeof type !== "string") {
    issues.error(path, "Componente sem 'type'.");
    return;
  }

  if (!KNOWN_COMPONENTS.has(type)) {
    issues.warning(path, `Componente desconhecido '${type}' (verifique a versão do Flow JSON).`);
  }
  registerFieldName(component, type, path, screen, issues);
  validateByType(component, type, path, screen, issues);
  validateComponentActions(component, path, screen, issues);
  validateNestedComponents(component, type, path, screen, issues);
}

function validateByType(
  component: JsonObject,
  type: string,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  if (type === "Footer") validateFooter(component, path, screen, issues);
  if (type === "Image") validateImage(component, path, issues);
  if (CHOICE_COMPONENTS.has(type)) validateChoiceOptions(component, path, issues);
}

function validateFooter(
  component: JsonObject,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  screen.footerCount++;
  if (!isJsonObject(component["on-click-action"])) {
    issues.error(path, "Footer exige 'on-click-action'.");
  }
}

function validateImage(component: JsonObject, path: string, issues: IssueCollector): void {
  if (typeof component.src !== "string") return;
  const approxBytes = Math.floor((component.src.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    issues.warning(path, `Imagem com ~${Math.round(approxBytes / 1024)} KB; recomendado até 300 KB.`);
  }
}

function validateChoiceOptions(component: JsonObject, path: string, issues: IssueCollector): void {
  const options = component["data-source"];
  if (!Array.isArray(options)) return; // pode vir dinamicamente via ${data.*}

  const seenIds = new Set<string>();
  options.forEach((option, index) => {
    const optionPath = `${path}.data-source[${index}]`;
    if (!isJsonObject(option) || typeof option.id !== "string" || typeof option.title !== "string") {
      issues.error(optionPath, "Opção precisa de 'id' e 'title' (strings).");
    } else if (seenIds.has(option.id)) {
      issues.error(optionPath, `Id de opção duplicado '${option.id}'.`);
    } else {
      seenIds.add(option.id);
    }
  });
}

function registerFieldName(
  component: JsonObject,
  type: string,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  const { name } = component;
  if (typeof name !== "string" || type === "Form") return;

  if (screen.fieldNames.has(name)) {
    issues.warning(
      path,
      `Nome de campo '${name}' repetido na tela '${screen.id}' (permitido apenas em ramos distintos de If/Switch).`
    );
    return;
  }
  screen.fieldNames.set(name, path);
}

function validateNestedComponents(
  component: JsonObject,
  type: string,
  path: string,
  screen: ScreenContext,
  issues: IssueCollector
): void {
  validateComponents(component.children, `${path}.children`, screen, issues);
  validateComponents(component.then, `${path}.then`, screen, issues);
  validateComponents(component.else, `${path}.else`, screen, issues);

  if (type === "Switch" && isJsonObject(component.cases)) {
    for (const [caseValue, caseChildren] of Object.entries(component.cases)) {
      validateComponents(caseChildren, `${path}.cases.${caseValue}`, screen, issues);
    }
  }
}
