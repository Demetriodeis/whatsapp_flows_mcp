import type { BlipClient, BlipCommandResponse } from "./blipClient.js";

/**
 * Categorias aceitas pela Meta para WhatsApp Flows.
 */
export const FLOW_CATEGORIES = [
  "SIGN_UP",
  "SIGN_IN",
  "APPOINTMENT_BOOKING",
  "LEAD_GENERATION",
  "CONTACT_US",
  "CUSTOMER_SUPPORT",
  "SURVEY",
  "OTHER",
] as const;
export type FlowCategory = (typeof FLOW_CATEGORIES)[number];

const BASE = "/whatsapp-flows";

function enc(id: string): string {
  const trimmed = String(id).trim();
  if (!trimmed) throw new Error("flow_id é obrigatório.");
  return encodeURIComponent(trimmed);
}

/**
 * Wrapper com os commands de WhatsApp Flows expostos pela Blip
 * (baseado na collection "WA Flows no Blip").
 */
export class WhatsAppFlowsApi {
  constructor(private readonly client: BlipClient) {}

  /** 1. Create — cria um flow em rascunho (DRAFT). */
  create(name: string, categories: FlowCategory[]): Promise<BlipCommandResponse> {
    return this.client.sendCommand({
      method: "set",
      uri: BASE,
      type: "application/json",
      resource: { name, categories },
    });
  }

  /** 2. List — lista os flows da conta WhatsApp vinculada ao bot. */
  list(): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "get", uri: `${BASE}/` });
  }

  /** 3. Details — detalhes de um flow. */
  get(flowId: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "get", uri: `${BASE}/${enc(flowId)}` });
  }

  /** 4. Update — atualiza metadados (nome/categorias). */
  update(
    flowId: string,
    data: { name?: string; categories?: FlowCategory[] }
  ): Promise<BlipCommandResponse> {
    return this.client.sendCommand({
      method: "set",
      uri: `${BASE}/${enc(flowId)}`,
      type: "application/json",
      resource: data,
    });
  }

  /** 5. Upload Flow JSON — envia/atualiza o JSON (telas) do flow. */
  uploadFlowJson(flowId: string, flowJson: unknown): Promise<BlipCommandResponse> {
    return this.client.sendCommand({
      method: "set",
      uri: `${BASE}/flow-json/${enc(flowId)}`,
      type: "application/json",
      resource: flowJson,
    });
  }

  /** 6. Upload Public Key — chave pública do negócio (necessária para flows com endpoint). */
  uploadPublicKey(publicKeyPem: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({
      method: "set",
      uri: `${BASE}/public-key/upload`,
      type: "application/json",
      resource: { business_public_key: publicKeyPem },
    });
  }

  /** 7. Publish — publica o flow (irreversível: o flow publicado não pode mais ser editado). */
  publish(flowId: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "get", uri: `${BASE}/publish/${enc(flowId)}` });
  }

  /** 8. Assets — lista os assets do flow (ex.: link para download do Flow JSON). */
  assets(flowId: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "get", uri: `${BASE}/assets/${enc(flowId)}` });
  }

  /** 9. Deprecate — deprecia um flow publicado (não pode mais ser enviado). */
  deprecate(flowId: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "get", uri: `${BASE}/deprecate/${enc(flowId)}` });
  }

  /** 10. Delete — exclui um flow em rascunho (DRAFT). */
  delete(flowId: string): Promise<BlipCommandResponse> {
    return this.client.sendCommand({ method: "delete", uri: `${BASE}/${enc(flowId)}` });
  }
}

/** Tenta extrair o id do flow da resposta do command de criação. */
export function extractFlowId(resource: unknown): string | undefined {
  if (!resource || typeof resource !== "object") return undefined;
  const r = resource as Record<string, unknown>;
  for (const key of ["id", "flowId", "flow_id"]) {
    const v = r[key];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return undefined;
}
