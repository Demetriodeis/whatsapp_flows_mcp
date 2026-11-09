import { BlipCommandError } from "../blip/errors.js";
import { toPrettyJson } from "../shared/json.js";

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** Resultado de sucesso: nota opcional seguida do JSON formatado. */
export function success(data: unknown, note?: string): ToolResult {
  const json = toPrettyJson(data);
  return textResult(note ? `${note}\n\n${json}` : json);
}

export function textResult(text: string, isError = false): ToolResult {
  return { content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) };
}

export function failure(error: unknown): ToolResult {
  if (error instanceof BlipCommandError) return textResult(toPrettyJson(error.toJSON()), true);
  const message = error instanceof Error ? error.message : String(error);
  return textResult(`Erro: ${message}`, true);
}

/** Envolve o handler de uma tool, convertendo exceções em resultado de erro do MCP. */
export function withErrorHandling<Args>(
  handler: (args: Args) => Promise<ToolResult> | ToolResult
): (args: Args) => Promise<ToolResult> {
  return async (args: Args) => {
    try {
      return await handler(args);
    } catch (error) {
      return failure(error);
    }
  };
}
