import { isJsonObject, type JsonObject } from "../../shared/json.js";
import type { IssueCollector } from "../issueCollector.js";
import type { ScreenContext } from "../screenContext.js";

const REFERENCE_PATTERN = /\$\{(form|data)\.([A-Za-z0-9_]+)/g;
/** Propriedades ignoradas na busca de referências (ex.: base64 de imagens). */
const IGNORED_PROPERTIES = new Set(["src"]);

/** Coleta referências `${form.*}` e `${data.*}` em qualquer string da árvore. */
export function collectReferences(node: unknown, path: string, screen: ScreenContext): void {
  if (typeof node === "string") {
    collectFromString(node, path, screen);
  } else if (Array.isArray(node)) {
    node.forEach((item, index) => collectReferences(item, `${path}[${index}]`, screen));
  } else if (isJsonObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (!IGNORED_PROPERTIES.has(key)) collectReferences(value, `${path}.${key}`, screen);
    }
  }
}

function collectFromString(text: string, path: string, screen: ScreenContext): void {
  for (const [, scope, name] of text.matchAll(REFERENCE_PATTERN)) {
    const target = scope === "form" ? screen.formReferences : screen.dataReferences;
    target.push({ name, path });
  }
}

/** `${data.x}` deve estar declarado em `screen.data`. */
export function validateDataReferences(
  screen: ScreenContext,
  screenData: JsonObject | undefined,
  issues: IssueCollector
): void {
  const declared = new Set(Object.keys(screenData ?? {}));
  for (const reference of screen.dataReferences) {
    if (!declared.has(reference.name)) {
      issues.warning(
        reference.path,
        `Referência '\${data.${reference.name}}' não declarada em '${screen.id}.data'.`
      );
    }
  }
}

/** `${form.x}` deve corresponder a um campo da própria tela. */
export function validateFormReferences(screen: ScreenContext, issues: IssueCollector): void {
  for (const reference of screen.formReferences) {
    if (!screen.fieldNames.has(reference.name)) {
      issues.warning(
        reference.path,
        `Referência '\${form.${reference.name}}' não corresponde a nenhum campo da tela '${screen.id}'.`
      );
    }
  }
}
