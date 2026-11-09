import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildFlowMessage, FLOW_MESSAGE_LIMITS } from "../../flows/flowMessage.js";
import { flowIdSchema } from "../schemas.js";
import { success, withErrorHandling } from "../toolResult.js";

/** Tools para enviar o flow aos usuários (via Builder da Blip). */
export function registerMessageTools(server: McpServer): void {
  server.registerTool(
    "build_flow_message",
    {
      title: "Gerar mensagem de envio do flow",
      description:
        "Gera o JSON da mensagem interativa do tipo 'flow' para colar em um Conteúdo Dinâmico no Builder " +
        "da Blip. Não chama a API.",
      inputSchema: {
        flow_id: flowIdSchema,
        first_screen: z
          .string()
          .optional()
          .describe("ID da primeira tela do Flow JSON (obrigatório para navigate)."),
        cta: z.string().min(1).max(FLOW_MESSAGE_LIMITS.cta).describe("Texto do botão que abre o flow."),
        body: z.string().min(1).max(FLOW_MESSAGE_LIMITS.body).describe("Texto do corpo da mensagem."),
        header: z.string().max(FLOW_MESSAGE_LIMITS.header).optional(),
        footer: z.string().max(FLOW_MESSAGE_LIMITS.footer).optional(),
        flow_token: z
          .string()
          .optional()
          .describe("Token para correlacionar a resposta (padrão: UUID). Aceita variáveis do Builder."),
        initial_data: z
          .record(z.any())
          .optional()
          .describe("Dados iniciais da primeira tela (devem estar declarados em screen.data)."),
        draft_mode: z.boolean().optional().describe("true para testar um flow ainda em DRAFT."),
        flow_action: z.enum(["navigate", "data_exchange"]).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withErrorHandling((args) => {
      const message = buildFlowMessage({
        flowId: args.flow_id,
        firstScreen: args.first_screen,
        cta: args.cta,
        body: args.body,
        header: args.header,
        footer: args.footer,
        flowToken: args.flow_token,
        initialData: args.initial_data,
        draftMode: args.draft_mode,
        flowAction: args.flow_action,
      });
      return success(message, "Cole este JSON em um bloco do Builder > Conteúdo Dinâmico.");
    })
  );
}
