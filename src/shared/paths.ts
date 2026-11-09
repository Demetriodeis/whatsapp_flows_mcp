import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Raiz do projeto (funciona tanto em `src/` via ts quanto em `dist/` compilado). */
export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const EXAMPLES_DIR = join(PROJECT_ROOT, "examples");
export const REFERENCE_DOCS_DIR = join(PROJECT_ROOT, "docs", "reference");
