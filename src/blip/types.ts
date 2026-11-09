/** Tipos do protocolo LIME usados pela API de Commands da Blip. */

export type CommandMethod = "get" | "set" | "delete" | "merge";

export interface BlipCommand {
  id: string;
  to: string;
  method: CommandMethod;
  uri: string;
  type?: string;
  resource?: unknown;
}

/** O que o chamador precisa informar; `id` e `to` são preenchidos pelo cliente. */
export interface CommandRequest {
  method: CommandMethod;
  uri: string;
  resource?: unknown;
}

export interface CommandResponse<T = unknown> {
  id?: string;
  method?: string;
  status: string;
  type?: string;
  resource?: T;
  reason?: { code?: number; description?: string };
}
