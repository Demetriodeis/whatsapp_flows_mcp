import { BlipClient } from "../blip/blipClient.js";
import { loadBlipConfig, type BlipConfigOverrides } from "../config/blipConfig.js";
import { WhatsAppFlowsApi } from "../flows/flowsApi.js";

/** Dependências compartilhadas pelas tools. */
export interface ToolContext {
  /** Retorna a API de flows; criada sob demanda para que tools offline funcionem sem credenciais. */
  getFlowsApi: () => WhatsAppFlowsApi;
}

export function createToolContext(overrides?: BlipConfigOverrides): ToolContext {
  let flowsApi: WhatsAppFlowsApi | undefined;
  return {
    getFlowsApi: () => {
      flowsApi ??= new WhatsAppFlowsApi(new BlipClient(loadBlipConfig(process.env, overrides)));
      return flowsApi;
    },
  };
}

export function createToolContextFromApi(flowsApi: WhatsAppFlowsApi): ToolContext {
  return { getFlowsApi: () => flowsApi };
}
