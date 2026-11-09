import type { JsonObject } from "../shared/json.js";
import { IssueCollector } from "./issueCollector.js";
import { parseFlowJson } from "./parseFlowJson.js";
import {
  validateEndpointSettings,
  validateNavigationTargets,
  validateRoutingModel,
  validateTerminalScreenExists,
} from "./rules/flowRules.js";
import { getScreens, measureSize, validateSize, validateVersion } from "./rules/rootRules.js";
import { validateScreen } from "./rules/screenRules.js";
import type { ScreenContext } from "./screenContext.js";
import type { ValidationResult, ValidationSummary } from "./types.js";

/**
 * Validação local (estática) de um Flow JSON do WhatsApp.
 *
 * Captura os erros mais comuns antes do upload, sem custo de API. Não substitui a
 * validação oficial da Meta, retornada em `validation_errors` após o upload.
 */
export function validateFlowJson(input: unknown): ValidationResult {
  const issues = new IssueCollector();

  let flow: JsonObject;
  try {
    flow = parseFlowJson(input);
  } catch (error) {
    issues.error("$", (error as Error).message);
    return buildResult(issues, emptySummary());
  }

  const sizeBytes = measureSize(flow);
  validateSize(sizeBytes, issues);
  validateVersion(flow, issues);

  const summary: ValidationSummary = { ...emptySummary(), version: readVersion(flow), sizeBytes };
  const screens = getScreens(flow, issues);
  if (!screens) return buildResult(issues, summary);

  const screenIds = new Set<string>();
  const contexts: ScreenContext[] = [];
  screens.forEach((screen, index) => {
    const validated = validateScreen(screen, `$.screens[${index}]`, screenIds, issues);
    if (validated?.isTerminal) summary.terminalScreens.push(validated.context.id);
    if (validated) contexts.push(validated.context);
  });
  summary.screens = [...screenIds];
  summary.usesDataExchange = contexts.some((screen) => screen.usesDataExchange);

  validateNavigationTargets(contexts, screenIds, issues);
  validateTerminalScreenExists(summary.terminalScreens, issues);
  validateEndpointSettings(flow, summary.usesDataExchange, issues);
  validateRoutingModel(flow, screenIds, issues);

  return buildResult(issues, summary);
}

function readVersion(flow: JsonObject): string | undefined {
  return typeof flow.version === "string" ? flow.version : undefined;
}

function emptySummary(): ValidationSummary {
  return { screens: [], terminalScreens: [], usesDataExchange: false, sizeBytes: 0 };
}

function buildResult(issues: IssueCollector, summary: ValidationSummary): ValidationResult {
  return {
    valid: !issues.hasErrors,
    errors: issues.errors,
    warnings: issues.warnings,
    summary,
  };
}
