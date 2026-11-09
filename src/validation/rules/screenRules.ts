import { isJsonObject, type JsonObject } from "../../shared/json.js";
import {
  MAX_FOOTERS_PER_SCREEN,
  REQUIRED_LAYOUT_TYPE,
  RESERVED_SCREEN_IDS,
  SCREEN_ID_PATTERN,
} from "../constants.js";
import type { IssueCollector } from "../issueCollector.js";
import { createScreenContext, type ScreenContext } from "../screenContext.js";
import { validateComponents } from "./componentRules.js";
import { collectReferences, validateDataReferences, validateFormReferences } from "./referenceRules.js";

export interface ValidatedScreen {
  context: ScreenContext;
  isTerminal: boolean;
}

/**
 * Valida uma tela e seus componentes. Retorna o contexto coletado, ou `undefined`
 * quando a tela é estruturalmente inválida demais para ser analisada.
 */
export function validateScreen(
  screen: unknown,
  path: string,
  knownIds: Set<string>,
  issues: IssueCollector
): ValidatedScreen | undefined {
  if (!isJsonObject(screen)) {
    issues.error(path, "Tela deve ser um objeto.");
    return undefined;
  }

  const id = validateScreenId(screen, path, knownIds, issues);
  validateTitle(screen, path, issues);
  const screenData = validateScreenData(screen, path, issues);

  const children = getLayoutChildren(screen, path, issues);
  if (!children) return undefined;

  const context = createScreenContext(id, path);
  validateComponents(children, `${path}.layout.children`, context, issues);
  collectReferences(screen.layout, `${path}.layout`, context);

  const isTerminal = screen.terminal === true;
  validateScreenConstraints(context, isTerminal, issues);
  validateDataReferences(context, screenData, issues);
  validateFormReferences(context, issues);

  return { context, isTerminal };
}

function validateScreenId(
  screen: JsonObject,
  path: string,
  knownIds: Set<string>,
  issues: IssueCollector
): string {
  const id = typeof screen.id === "string" ? screen.id : "";
  const idPath = `${path}.id`;

  if (!id) {
    issues.error(idPath, "Tela sem 'id'.");
    return id;
  }
  if (!SCREEN_ID_PATTERN.test(id)) {
    issues.error(idPath, `Id de tela '${id}' inválido: use apenas letras e '_'.`);
  }
  if (RESERVED_SCREEN_IDS.has(id)) {
    issues.error(idPath, `'${id}' é um id reservado e não pode ser usado.`);
  }
  if (knownIds.has(id)) {
    issues.error(idPath, `Id de tela duplicado: '${id}'.`);
  }
  knownIds.add(id);
  return id;
}

function validateTitle(screen: JsonObject, path: string, issues: IssueCollector): void {
  if (screen.title !== undefined && typeof screen.title !== "string") {
    issues.error(`${path}.title`, "'title' deve ser string.");
  }
}

/** Cada entrada de `data` precisa de `type` e `__example__` (usado no preview da Meta). */
function validateScreenData(
  screen: JsonObject,
  path: string,
  issues: IssueCollector
): JsonObject | undefined {
  if (screen.data === undefined) return undefined;
  if (!isJsonObject(screen.data)) {
    issues.error(`${path}.data`, "'data' deve ser um objeto.");
    return undefined;
  }

  for (const [key, declaration] of Object.entries(screen.data)) {
    const declarationPath = `${path}.data.${key}`;
    if (!isJsonObject(declaration) || typeof declaration.type !== "string") {
      issues.warning(declarationPath, "Cada entrada de 'data' deve ter 'type' e '__example__'.");
    } else if (!("__example__" in declaration)) {
      issues.warning(
        declarationPath,
        "Entrada de 'data' sem '__example__' (exigido pela Meta para preview)."
      );
    }
  }
  return screen.data;
}

function getLayoutChildren(screen: JsonObject, path: string, issues: IssueCollector): unknown[] | undefined {
  const { layout } = screen;
  if (!isJsonObject(layout)) {
    issues.error(`${path}.layout`, "Tela sem 'layout'.");
    return undefined;
  }
  if (layout.type !== REQUIRED_LAYOUT_TYPE) {
    issues.error(`${path}.layout.type`, `layout.type deve ser '${REQUIRED_LAYOUT_TYPE}'.`);
  }
  if (!Array.isArray(layout.children)) {
    issues.error(`${path}.layout.children`, "layout.children deve ser um array.");
    return undefined;
  }
  return layout.children;
}

function validateScreenConstraints(screen: ScreenContext, isTerminal: boolean, issues: IssueCollector): void {
  if (screen.footerCount > MAX_FOOTERS_PER_SCREEN) {
    issues.error(
      screen.path,
      `Tela '${screen.id}' tem ${screen.footerCount} Footers; o máximo é ${MAX_FOOTERS_PER_SCREEN} por tela.`
    );
  }
  if (isTerminal && screen.footerCount === 0) {
    issues.error(screen.path, `Tela terminal '${screen.id}' precisa de um Footer.`);
  }
  if (screen.usesCompleteAction && !isTerminal) {
    issues.error(
      screen.path,
      `A ação 'complete' só pode ser usada em telas terminais ('terminal': true). Tela: '${screen.id}'.`
    );
  }
}
