import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../context.js";
import { success, withErrorHandling } from "../toolResult.js";

const PEM_PUBLIC_KEY_HEADER = "-----BEGIN PUBLIC KEY-----";

/** Tools para flows com endpoint (data channel). */
export function registerEndpointTools(server: McpServer, { getFlowsApi }: ToolContext): void {
  server.registerTool(
    "upload_public_key",
    {
      title: "Enviar chave pública",
      description:
        "Envia a chave pública RSA (PEM) do negócio, necessária para flows com endpoint (data_exchange). " +
        "A chave vale para um único número: reenvie ao usar o flow em outro número/roteador.",
      inputSchema: {
        public_key: z
          .string()
          .min(1)
          .describe(`Chave pública em formato PEM (${PEM_PUBLIC_KEY_HEADER} ...).`),
      },
    },
    withErrorHandling(async ({ public_key }) => {
      if (!public_key.includes(PEM_PUBLIC_KEY_HEADER)) {
        throw new Error(`A chave deve estar em formato PEM, começando com '${PEM_PUBLIC_KEY_HEADER}'.`);
      }
      const response = await getFlowsApi().uploadPublicKey(public_key);
      return success(response.resource, "Chave pública enviada.");
    })
  );
}
