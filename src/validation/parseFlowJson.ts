import { isJsonObject, type JsonObject } from "../shared/json.js";

/** Aceita o Flow JSON como objeto ou string e devolve sempre um objeto. */
export function parseFlowJson(input: unknown): JsonObject {
  const value = typeof input === "string" ? parseString(input) : input;
  if (!isJsonObject(value)) throw new Error("Flow JSON deve ser um objeto.");
  return value;
}

function parseString(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Flow JSON inválido (erro de sintaxe): ${(error as Error).message}`);
  }
}
