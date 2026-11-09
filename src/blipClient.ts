import { randomUUID } from "node:crypto";
import type { BlipConfig } from "./config.js";

export type CommandMethod = "get" | "set" | "delete" | "merge";

export interface BlipCommand {
  id: string;
  to: string;
  method: CommandMethod;
  uri: string;
  type?: string;
  resource?: unknown;
}

export interface BlipCommandResponse<T = unknown> {
  id?: string;
  from?: string;
  to?: string;
  method?: string;
  status: "success" | "failure" | string;
  type?: string;
  resource?: T;
  reason?: { code?: number; description?: string };
  metadata?: Record<string, unknown>;
}

export class BlipCommandError extends Error {
  constructor(
    message: string,
    public readonly command: Omit<BlipCommand, "resource">,
    public readonly response?: BlipCommandResponse,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "BlipCommandError";
  }
}

type FetchLike = typeof fetch;

/**
 * Cliente mínimo para a API de Commands da Blip (protocolo LIME via HTTP).
 * Todos os commands são enviados via POST para {commandsUrl}.
 */
export class BlipClient {
  constructor(
    private readonly config: BlipConfig,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  get flowsTo(): string {
    return this.config.flowsTo;
  }

  async sendCommand<T = unknown>(
    cmd: Omit<BlipCommand, "id" | "to"> & { id?: string; to?: string }
  ): Promise<BlipCommandResponse<T>> {
    const command: BlipCommand = {
      id: cmd.id ?? randomUUID(),
      to: cmd.to ?? this.config.flowsTo,
      method: cmd.method,
      uri: cmd.uri,
      ...(cmd.type ? { type: cmd.type } : {}),
      ...(cmd.resource !== undefined ? { resource: cmd.resource } : {}),
    };
    const { resource: _omit, ...commandSummary } = command;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(this.config.commandsUrl, {
        method: "POST",
        headers: {
          Authorization: this.config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });
    } catch (err) {
      const msg = (err as Error).name === "AbortError"
        ? `Timeout após ${this.config.timeoutMs}ms`
        : (err as Error).message;
      throw new BlipCommandError(`Falha de rede ao chamar a Blip: ${msg}`, commandSummary);
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let body: BlipCommandResponse<T> | undefined;
    try {
      body = text ? (JSON.parse(text) as BlipCommandResponse<T>) : undefined;
    } catch {
      body = undefined;
    }

    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403
        ? " Verifique BLIP_API_KEY e BLIP_CONTRACT_ID/BLIP_COMMANDS_URL."
        : "";
      throw new BlipCommandError(
        `HTTP ${res.status} da Blip.${hint} Corpo: ${text.slice(0, 2000)}`,
        commandSummary,
        body,
        res.status
      );
    }
    if (!body) {
      throw new BlipCommandError(`Resposta inválida da Blip: ${text.slice(0, 2000)}`, commandSummary);
    }
    if (body.status !== "success") {
      const code = body.reason?.code !== undefined ? ` (código ${body.reason.code})` : "";
      throw new BlipCommandError(
        `Command falhou${code}: ${body.reason?.description ?? "sem descrição"}`,
        commandSummary,
        body,
        res.status
      );
    }
    return body;
  }
}
