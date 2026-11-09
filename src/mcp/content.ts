import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EXAMPLES_DIR, REFERENCE_DOCS_DIR } from "../shared/paths.js";

/** Conteúdo estático (docs de referência e exemplos) servido como resources/tools. */

export const REFERENCE_DOCS = {
  commands: "blip-commands.md",
  flowJson: "flow-json.md",
} as const;

export function readReferenceDoc(fileName: string): string {
  return readFileSync(join(REFERENCE_DOCS_DIR, fileName), "utf8");
}

export function listExampleFiles(): string[] {
  try {
    return readdirSync(EXAMPLES_DIR)
      .filter((file) => file.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

/** Aceita o nome com ou sem ".json". Retorna `undefined` se não existir. */
export function readExample(name: string): string | undefined {
  const fileName = name.endsWith(".json") ? name : `${name}.json`;
  if (!listExampleFiles().includes(fileName)) return undefined;
  return readFileSync(join(EXAMPLES_DIR, fileName), "utf8");
}
