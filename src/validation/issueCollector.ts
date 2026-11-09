import type { ValidationIssue } from "./types.js";

/** Acumula erros e avisos encontrados pelas regras de validação. */
export class IssueCollector {
  readonly errors: ValidationIssue[] = [];
  readonly warnings: ValidationIssue[] = [];

  error(path: string, message: string): void {
    this.errors.push({ level: "error", path, message });
  }

  warning(path: string, message: string): void {
    this.warnings.push({ level: "warning", path, message });
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
