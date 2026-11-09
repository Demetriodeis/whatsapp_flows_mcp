import type { BlipCommand, CommandResponse } from "./types.js";

/** Resumo do command sem o `resource` (que pode ser grande, ex.: Flow JSON com imagens). */
export type CommandSummary = Omit<BlipCommand, "resource">;

export class BlipCommandError extends Error {
  constructor(
    message: string,
    readonly command: CommandSummary,
    readonly response?: CommandResponse,
    readonly httpStatus?: number
  ) {
    super(message);
    this.name = "BlipCommandError";
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      command: this.command,
      httpStatus: this.httpStatus,
      response: this.response,
    };
  }
}
