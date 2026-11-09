import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { confirmationSchema, flowIdSchema } from "../schemas.js";
import { success, withErrorHandling } from "../toolResult.js";

/**
 * Tools que mudam o ciclo de vida do flow (DRAFT -> PUBLISHED -> DEPRECATED, ou exclusão).
 * Todas são irreversíveis e exigem `confirm: true`.
 */
export function registerLifecycleTools(server: McpServer, { getFlowsApi }: ToolContext): void {
  const destructive = { destructiveHint: true, idempotentHint: false } as const;

  server.registerTool(
    "publish_flow",
    {
      title: "Publicar flow",
      description:
        "Publica o flow. IRREVERSÍVEL: depois de publicado, não pode ser editado nem excluído (apenas depreciado). " +
        "Só chame com confirmação explícita do usuário e após conferir que não há validation_errors.",
      inputSchema: { flow_id: flowIdSchema, confirm: confirmationSchema },
      annotations: destructive,
    },
    withErrorHandling(async ({ flow_id }) =>
      success((await getFlowsApi().publish(flow_id)).resource, "Flow publicado.")
    )
  );

  server.registerTool(
    "deprecate_flow",
    {
      title: "Depreciar flow",
      description: "Deprecia um flow PUBLICADO; ele não poderá mais ser enviado. Irreversível.",
      inputSchema: { flow_id: flowIdSchema, confirm: confirmationSchema },
      annotations: destructive,
    },
    withErrorHandling(async ({ flow_id }) =>
      success((await getFlowsApi().deprecate(flow_id)).resource, "Flow depreciado.")
    )
  );

  server.registerTool(
    "delete_flow",
    {
      title: "Excluir flow",
      description:
        "Exclui um flow que NUNCA foi publicado (DRAFT). Para flows publicados, use deprecate_flow.",
      inputSchema: { flow_id: flowIdSchema, confirm: confirmationSchema },
      annotations: destructive,
    },
    withErrorHandling(async ({ flow_id }) =>
      success((await getFlowsApi().delete(flow_id)).resource, "Flow excluído.")
    )
  );
}
