export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  /** Caminho estilo JSONPath até o ponto do problema, ex.: `$.screens[0].layout`. */
  path: string;
  message: string;
}

export interface ValidationSummary {
  version?: string;
  screens: string[];
  terminalScreens: string[];
  usesDataExchange: boolean;
  sizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: ValidationSummary;
}
