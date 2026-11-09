import { randomUUID } from "node:crypto";
import type { BlipConfig } from "../config/blipConfig.js";
import { BlipCommandError, type CommandSummary } from "./errors.js";
import type { BlipCommand, CommandRequest, CommandResponse } from "./types.js";

const MAX_ERROR_BODY_CHARS = 2000;
const JSON_CONTENT_TYPE = "application/json";

/**
 * Cliente da API de Commands da Blip (protocolo LIME sobre HTTP).
 * Cada command é um POST para `config.commandsUrl`.
 */
export class BlipClient {
  constructor(
    private readonly config: BlipConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async send<T = unknown>(request: CommandRequest): Promise<CommandResponse<T>> {
    const command = this.buildCommand(request);
    const summary = summarize(command);

    const httpResponse = await this.post(command, summary);
    const rawBody = await httpResponse.text();
    const body = parseJson<CommandResponse<T>>(rawBody);

    assertHttpSuccess(httpResponse, rawBody, body, summary);
    assertCommandSuccess(body, rawBody, summary, httpResponse.status);
    return body;
  }

  private buildCommand(request: CommandRequest): BlipCommand {
    const hasResource = request.resource !== undefined;
    return {
      id: randomUUID(),
      to: this.config.flowsRecipient,
      method: request.method,
      uri: request.uri,
      ...(hasResource ? { type: JSON_CONTENT_TYPE, resource: request.resource } : {}),
    };
  }

  private async post(command: BlipCommand, summary: CommandSummary): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.fetchImpl(this.config.commandsUrl, {
        method: "POST",
        headers: { Authorization: this.config.authorization, "Content-Type": JSON_CONTENT_TYPE },
        body: JSON.stringify(command),
        signal: controller.signal,
      });
    } catch (error) {
      const reason = isAbortError(error)
        ? `timeout após ${this.config.timeoutMs}ms`
        : (error as Error).message;
      throw new BlipCommandError(`Falha de rede ao chamar a Blip: ${reason}`, summary);
    } finally {
      clearTimeout(timer);
    }
  }
}

function summarize(command: BlipCommand): CommandSummary {
  const { resource: _resource, ...summary } = command;
  return summary;
}

function parseJson<T>(text: string): T | undefined {
  try {
    return text ? (JSON.parse(text) as T) : undefined;
  } catch {
    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return (error as Error)?.name === "AbortError";
}

function truncate(text: string): string {
  return text.slice(0, MAX_ERROR_BODY_CHARS);
}

function assertHttpSuccess(
  response: Response,
  rawBody: string,
  body: CommandResponse | undefined,
  summary: CommandSummary
): void {
  if (response.ok) return;
  const isAuthError = response.status === 401 || response.status === 403;
  const hint = isAuthError ? " Verifique BLIP_API_KEY e BLIP_CONTRACT_ID/BLIP_COMMANDS_URL." : "";
  throw new BlipCommandError(
    `HTTP ${response.status} da Blip.${hint} Corpo: ${truncate(rawBody)}`,
    summary,
    body,
    response.status
  );
}

function assertCommandSuccess<T>(
  body: CommandResponse<T> | undefined,
  rawBody: string,
  summary: CommandSummary,
  httpStatus: number
): asserts body is CommandResponse<T> {
  if (!body) {
    throw new BlipCommandError(`Resposta inválida da Blip: ${truncate(rawBody)}`, summary);
  }
  if (body.status === "success") return;

  const code = body.reason?.code !== undefined ? ` (código ${body.reason.code})` : "";
  const description = body.reason?.description ?? "sem descrição";
  throw new BlipCommandError(`Command falhou${code}: ${description}`, summary, body, httpStatus);
}
