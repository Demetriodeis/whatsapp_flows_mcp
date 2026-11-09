import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractFlowId } from "../../flows/responseParsers.js";
import { toPrettyJson } from "../../shared/json.js";
import { parseFlowJson, validateFlowJson, type ValidationResult } from "../../validation/index.js";
import { listExampleFiles, readExample } from "../content.js";
import type { ToolContext } from "../context.js";
import { categoriesSchema, flowIdSchema, flowJsonSchema, flowNameSchema } from "../schemas.js";
import { success, textResult, withErrorHandling, type ToolResult } from "../toolResult.js";

/** Tools para escrever, validar e enviar o Flow JSON. */
export function registerFlowJsonTools(server: McpServer, { getFlowsApi }: ToolContext): void {
  server.registerTool(
    "validate_flow_json",
    {
      title: "Validar Flow JSON",
      description:
        "Valida localmente um Flow JSON (estrutura, ids de tela, navegação, telas terminais, Footer, " +
        "referências ${form.*}/${data.*}, data_exchange/routing_model). Não chama a API.",
      inputSchema: { flow_json: flowJsonSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withErrorHandling(({ flow_json }) => success(validateFlowJson(flow_json)))
  );

  server.registerTool(
    "upload_flow_json",
    {
      title: "Enviar Flow JSON",
      description:
        "Envia (substitui) o Flow JSON — telas e componentes — de um flow em DRAFT. Valida localmente antes; " +
        "erros bloqueiam o envio, a menos que skip_validation=true. Depois, confira validation_errors.",
      inputSchema: {
        flow_id: flowIdSchema,
        flow_json: flowJsonSchema,
        skip_validation: z.boolean().optional().describe("Envia mesmo se a validação local apontar erros."),
      },
    },
    withErrorHandling(async ({ flow_id, flow_json, skip_validation }) => {
      const flowJson = parseFlowJson(flow_json);
      const validation = validateFlowJson(flowJson);
      if (!validation.valid && !skip_validation) {
        return validationFailure(
          "Upload não realizado: a validação local encontrou erros. Corrija ou use skip_validation=true.",
          validation
        );
      }
      const response = await getFlowsApi().uploadFlowJson(flow_id, flowJson);
      return success(
        { blip_response: response.resource, local_validation_warnings: validation.warnings },
        "Flow JSON enviado. Verifique 'validation_errors' na resposta (vazio = OK)."
      );
    })
  );

  server.registerTool(
    "create_flow_with_json",
    {
      title: "Criar flow completo",
      description:
        "Atalho: valida o Flow JSON, cria o flow (DRAFT), envia o JSON e retorna os detalhes " +
        "(status, validation_errors e link de preview). Não publica.",
      inputSchema: { name: flowNameSchema, categories: categoriesSchema, flow_json: flowJsonSchema },
    },
    withErrorHandling(async ({ name, categories, flow_json }) => {
      const flowJson = parseFlowJson(flow_json);
      const validation = validateFlowJson(flowJson);
      if (!validation.valid) {
        return validationFailure("Flow não criado: corrija os erros de validação.", validation);
      }

      const flowsApi = getFlowsApi();
      const created = await flowsApi.create(name, categories);
      const flowId = extractFlowId(created.resource);
      if (!flowId) {
        return success(created.resource, "Flow criado, mas não foi possível identificar o ID na resposta.");
      }

      const upload = await flowsApi.uploadFlowJson(flowId, flowJson);
      const details = await flowsApi.get(flowId);
      return success(
        {
          flow_id: flowId,
          first_screen: validation.summary.screens[0],
          upload: upload.resource,
          details: details.resource,
          local_validation_warnings: validation.warnings,
        },
        `Flow criado em DRAFT (flow_id = ${flowId}). Revise o preview antes de publicar.`
      );
    })
  );

  server.registerTool(
    "get_flow_json_example",
    {
      title: "Exemplo de Flow JSON",
      description: `Retorna um Flow JSON de exemplo. Disponíveis: ${listExampleFiles().join(", ") || "(nenhum)"}.`,
      inputSchema: { name: z.string().optional().describe("Nome do exemplo; omita para listar.") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    withErrorHandling(({ name }) => {
      if (!name) return success({ examples: listExampleFiles() });
      const example = readExample(name);
      if (!example) {
        throw new Error(`Exemplo '${name}' não encontrado. Disponíveis: ${listExampleFiles().join(", ")}`);
      }
      return textResult(example);
    })
  );
}

function validationFailure(message: string, validation: ValidationResult): ToolResult {
  return textResult(`${message}\n\n${toPrettyJson(validation)}`, true);
}
