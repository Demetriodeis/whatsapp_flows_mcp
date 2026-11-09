import type { BlipClient } from "../blip/blipClient.js";
import type { CommandResponse } from "../blip/types.js";
import type { FlowCategory } from "./categories.js";

const FLOWS_URI = "/whatsapp-flows";

/** URIs dos commands de WhatsApp Flows, conforme a collection "WA Flows no Blip". */
export const flowUris = {
  collection: () => FLOWS_URI,
  list: () => `${FLOWS_URI}/`,
  flow: (flowId: string) => `${FLOWS_URI}/${encodeFlowId(flowId)}`,
  flowJson: (flowId: string) => `${FLOWS_URI}/flow-json/${encodeFlowId(flowId)}`,
  publish: (flowId: string) => `${FLOWS_URI}/publish/${encodeFlowId(flowId)}`,
  assets: (flowId: string) => `${FLOWS_URI}/assets/${encodeFlowId(flowId)}`,
  deprecate: (flowId: string) => `${FLOWS_URI}/deprecate/${encodeFlowId(flowId)}`,
  publicKey: () => `${FLOWS_URI}/public-key/upload`,
};

export interface FlowMetadata {
  name?: string;
  categories?: FlowCategory[];
}

/**
 * Operações de WhatsApp Flows sobre a API de Commands da Blip.
 * Cada método corresponde a um request da collection Postman.
 */
export class WhatsAppFlowsApi {
  constructor(private readonly client: BlipClient) {}

  /** Cria um flow em DRAFT na WABA vinculada ao bot. */
  async create(name: string, categories: FlowCategory[]): Promise<CommandResponse> {
    return this.client.send({ method: "set", uri: flowUris.collection(), resource: { name, categories } });
  }

  /** Lista flows com status e erros de validação. */
  async list(): Promise<CommandResponse> {
    return this.client.send({ method: "get", uri: flowUris.list() });
  }

  /** Detalhes do flow, incluindo o link de preview. */
  async get(flowId: string): Promise<CommandResponse> {
    return this.client.send({ method: "get", uri: flowUris.flow(flowId) });
  }

  /** Atualiza nome e/ou categorias (apenas DRAFT). */
  async updateMetadata(flowId: string, metadata: FlowMetadata): Promise<CommandResponse> {
    return this.client.send({ method: "set", uri: flowUris.flow(flowId), resource: metadata });
  }

  /** Envia (substitui) o Flow JSON (apenas DRAFT). */
  async uploadFlowJson(flowId: string, flowJson: unknown): Promise<CommandResponse> {
    return this.client.send({ method: "set", uri: flowUris.flowJson(flowId), resource: flowJson });
  }

  /** Envia a chave pública RSA (PEM) usada por flows com endpoint. Vale para um único número. */
  async uploadPublicKey(publicKeyPem: string): Promise<CommandResponse> {
    return this.client.send({
      method: "set",
      uri: flowUris.publicKey(),
      resource: { business_public_key: publicKeyPem },
    });
  }

  /** Publica o flow. Irreversível: o flow não poderá mais ser editado. */
  async publish(flowId: string): Promise<CommandResponse> {
    return this.client.send({ method: "get", uri: flowUris.publish(flowId) });
  }

  /** Assets do flow (ex.: link para download do Flow JSON atual). */
  async getAssets(flowId: string): Promise<CommandResponse> {
    return this.client.send({ method: "get", uri: flowUris.assets(flowId) });
  }

  /** Deprecia um flow publicado; ele não poderá mais ser enviado. */
  async deprecate(flowId: string): Promise<CommandResponse> {
    return this.client.send({ method: "get", uri: flowUris.deprecate(flowId) });
  }

  /** Exclui um flow que nunca foi publicado. */
  async delete(flowId: string): Promise<CommandResponse> {
    return this.client.send({ method: "delete", uri: flowUris.flow(flowId) });
  }
}

function encodeFlowId(flowId: string): string {
  const trimmed = String(flowId).trim();
  if (!trimmed) throw new Error("flow_id é obrigatório.");
  return encodeURIComponent(trimmed);
}
