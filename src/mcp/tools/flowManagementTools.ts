import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractFlowId, findDownloadUrl } from "../../flows/responseParsers.js";
import type { ToolContext } from "../context.js";
import { categoriesSchema, flowIdSchema, flowNameSchema } from "../schemas.js";
import { success, textResult, withErrorHandling } from "../toolResult.js";

/** Tools de CRUD e consulta de flows (create, list, get, update, assets). */
export function registerFlowManagementTools(server: McpServer, { getFlowsApi }: ToolContext): void {
  server.registerTool(
    "create_flow",
    {
      title: "Criar WhatsApp Flow",
      description:
        "Cria um novo WhatsApp Flow (status DRAFT) na WABA vinculada ao bot. " +
        "Retorna o ID do flow, necessário para as demais operações.",
      inputSchema: { name: flowNameSchema, categories: categoriesSchema },
    },
    withErrorHandling(async ({ name, categories }) => {
      const response = await getFlowsApi().create(name, categories);
      const flowId = extractFlowId(response.resource);
      return success(response.resource, flowId ? `Flow criado. flow_id = ${flowId}` : "Flow criado.");
    })
  );

  server.registerTool(
    "list_flows",
    {
      title: "Listar WhatsApp Flows",
      description:
        "Lista os flows da WABA com nome, categorias, status (DRAFT/PUBLISHED/DEPRECATED) e erros de validação.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    withErrorHandling(async () => success((await getFlowsApi().list()).resource))
  );

  server.registerTool(
    "get_flow",
    {
      title: "Detalhes do WhatsApp Flow",
      description:
        "Retorna detalhes do flow: status, categorias, validation_errors, link de preview " +
        "(expira em ~30 dias) e dados da WABA.",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    withErrorHandling(async ({ flow_id }) => success((await getFlowsApi().get(flow_id)).resource))
  );

  server.registerTool(
    "update_flow_metadata",
    {
      title: "Atualizar nome/categorias do flow",
      description: "Atualiza nome e/ou categorias de um flow em DRAFT.",
      inputSchema: {
        flow_id: flowIdSchema,
        name: flowNameSchema.optional(),
        categories: categoriesSchema.optional(),
      },
    },
    withErrorHandling(async ({ flow_id, name, categories }) => {
      if (!name && !categories) throw new Error("Informe ao menos 'name' ou 'categories'.");
      const response = await getFlowsApi().updateMetadata(flow_id, { name, categories });
      return success(response.resource, "Flow atualizado.");
    })
  );

  server.registerTool(
    "get_flow_assets",
    {
      title: "Assets do flow",
      description: "Lista os assets do flow, incluindo o link para baixar o Flow JSON atual.",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    withErrorHandling(async ({ flow_id }) => success((await getFlowsApi().getAssets(flow_id)).resource))
  );

  server.registerTool(
    "download_flow_json",
    {
      title: "Baixar Flow JSON atual",
      description:
        "Busca os assets do flow e baixa o Flow JSON atual (útil para editar ou clonar um flow publicado).",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    withErrorHandling(async ({ flow_id }) => {
      const assets = await getFlowsApi().getAssets(flow_id);
      const downloadUrl = findDownloadUrl(assets.resource);
      if (!downloadUrl) return success(assets.resource, "Nenhuma download_url encontrada nos assets.");
      return textResult(await downloadText(downloadUrl));
    })
  );
}

async function downloadText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar Flow JSON (HTTP ${response.status}).`);
  return response.text();
}
