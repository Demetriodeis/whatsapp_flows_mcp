import { BlipClient } from "../../dist/blip/blipClient.js";
import { loadBlipConfig } from "../../dist/config/blipConfig.js";
import { WhatsAppFlowsApi } from "../../dist/flows/flowsApi.js";

export const TEST_ENV = { BLIP_API_KEY: "abc", BLIP_CONTRACT_ID: "meu-contrato" };

/** Cria a API de flows com um fetch falso que registra as chamadas. */
export function createMockedFlowsApi(
  responseBody = { status: "success", resource: { id: "123" } },
  httpStatus = 200
) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(responseBody), { status: httpStatus });
  };
  const client = new BlipClient(loadBlipConfig(TEST_ENV), fetchImpl);
  return { api: new WhatsAppFlowsApi(client), calls };
}
