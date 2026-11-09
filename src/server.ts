import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BlipClient, BlipCommandError } from "./blipClient.js";
import { loadConfig, type ConfigOverrides } from "./config.js";
import { buildFlowMessage } from "./flowMessage.js";
import { FLOW_CATEGORIES, WhatsAppFlowsApi, extractFlowId } from "./flowsApi.js";
import { BLIP_COMMANDS_REFERENCE, FLOW_JSON_REFERENCE } from "./resources/reference.js";
import { parseFlowJson, validateFlowJson } from "./validation.js";

const EXAMPLES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "examples");

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

function ok(data: unknown, note?: string): ToolResult {
  const text = (note ? `${note}\n\n` : "") + JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

function fail(e: unknown): ToolResult {
  if (e instanceof BlipCommandError) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify(
          { error: e.message, command: e.command, httpStatus: e.httpStatus, response: e.response },
          null,
          2
        ),
      }],
    };
  }
  return { isError: true, content: [{ type: "text", text: `Erro: ${(e as Error).message ?? String(e)}` }] };
}

const flowIdSchema = z.string().min(1).describe("ID do flow (retornado na criação ou na listagem).");
const categoriesSchema = z
  .array(z.enum(FLOW_CATEGORIES))
  .min(1)
  .describe(`Ao menos uma categoria: ${FLOW_CATEGORIES.join(", ")}.`);
const flowJsonSchema = z
  .union([z.string(), z.record(z.any())])
  .describe("Flow JSON (objeto ou string JSON) com 'version' e 'screens'.");

function listExamples(): string[] {
  try {
    return readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

/** Procura recursivamente uma URL de download no resource de assets. */
function findDownloadUrl(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const u = findDownloadUrl(n);
      if (u) return u;
    }
    return undefined;
  }
  const o = node as Record<string, unknown>;
  for (const k of ["download_url", "downloadUrl"]) {
    if (typeof o[k] === "string") return o[k] as string;
  }
  for (const v of Object.values(o)) {
    const u = findDownloadUrl(v);
    if (u) return u;
  }
  return undefined;
}

export interface CreateServerOptions {
  api?: WhatsAppFlowsApi;
  /** Overrides de configuração (ex.: credenciais vindas de headers no modo HTTP). */
  configOverrides?: ConfigOverrides;
}

export function createServer(opts: CreateServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: "whatsapp-flows-blip", version: "0.1.0" },
    {
      instructions:
        "Servidor MCP para construir e gerenciar WhatsApp Flows via API de Commands da Blip. " +
        "Fluxo típico: 1) leia o recurso 'blip://docs/flow-json' e os exemplos; 2) escreva o Flow JSON e " +
        "valide com validate_flow_json; 3) create_flow (ou create_flow_with_json); 4) upload_flow_json; " +
        "5) get_flow para checar validation_errors e o link de preview; 6) publish_flow somente com confirmação " +
        "explícita do usuário (irreversível); 7) build_flow_message para gerar o JSON de envio no Builder.",
    }
  );

  // A API é criada sob demanda, para que tools offline (validação, exemplos) funcionem sem credenciais.
  let api = opts.api;
  const getApi = (): WhatsAppFlowsApi => {
    if (!api) api = new WhatsAppFlowsApi(new BlipClient(loadConfig(process.env, opts.configOverrides)));
    return api;
  };

  // ------------------------------------------------------------------ tools: Blip commands
  server.registerTool(
    "create_flow",
    {
      title: "Criar WhatsApp Flow",
      description:
        "Cria um novo WhatsApp Flow (status DRAFT) na WABA vinculada ao bot. Retorna o ID do flow, " +
        "necessário para as demais operações.",
      inputSchema: { name: z.string().min(1).max(200).describe("Nome do flow."), categories: categoriesSchema },
    },
    async ({ name, categories }) => {
      try {
        const res = await getApi().create(name, categories);
        const flowId = extractFlowId(res.resource);
        return ok(res.resource ?? res, flowId ? `Flow criado. flow_id = ${flowId}` : "Flow criado.");
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "list_flows",
    {
      title: "Listar WhatsApp Flows",
      description: "Lista os flows da WABA com nome, categorias, status (DRAFT/PUBLISHED/DEPRECATED) e erros de validação.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const res = await getApi().list();
        return ok(res.resource ?? res);
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "get_flow",
    {
      title: "Detalhes do WhatsApp Flow",
      description:
        "Retorna detalhes do flow: status, categorias, validation_errors, link de preview (expira em ~30 dias) e dados da WABA.",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().get(flow_id);
        return ok(res.resource ?? res);
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "update_flow_metadata",
    {
      title: "Atualizar nome/categorias do flow",
      description: "Atualiza nome e/ou categorias de um flow em DRAFT.",
      inputSchema: {
        flow_id: flowIdSchema,
        name: z.string().min(1).max(200).optional().describe("Novo nome."),
        categories: categoriesSchema.optional(),
      },
    },
    async ({ flow_id, name, categories }) => {
      try {
        if (!name && !categories) throw new Error("Informe ao menos 'name' ou 'categories'.");
        const res = await getApi().update(flow_id, {
          ...(name ? { name } : {}),
          ...(categories ? { categories } : {}),
        });
        return ok(res.resource ?? res, "Flow atualizado.");
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "upload_flow_json",
    {
      title: "Enviar Flow JSON",
      description:
        "Envia (substitui) o Flow JSON — as telas e componentes — de um flow em DRAFT. Valida localmente antes " +
        "de enviar; erros bloqueiam o envio, a menos que skip_validation=true. Depois do envio, confira " +
        "validation_errors na resposta ou com get_flow.",
      inputSchema: {
        flow_id: flowIdSchema,
        flow_json: flowJsonSchema,
        skip_validation: z.boolean().optional().describe("Envia mesmo se a validação local apontar erros."),
      },
    },
    async ({ flow_id, flow_json, skip_validation }) => {
      try {
        const parsed = parseFlowJson(flow_json);
        const validation = validateFlowJson(parsed);
        if (!validation.valid && !skip_validation) {
          return {
            isError: true,
            content: [{
              type: "text",
              text:
                "Upload não realizado: a validação local encontrou erros. Corrija ou use skip_validation=true.\n\n" +
                JSON.stringify(validation, null, 2),
            }],
          };
        }
        const res = await getApi().uploadFlowJson(flow_id, parsed);
        return ok(
          { blip_response: res.resource ?? res, local_validation_warnings: validation.warnings },
          "Flow JSON enviado. Verifique 'validation_errors' na resposta (vazio = OK)."
        );
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "get_flow_assets",
    {
      title: "Assets do flow",
      description: "Lista os assets do flow, incluindo o link para baixar o Flow JSON atual.",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().assets(flow_id);
        return ok(res.resource ?? res);
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "download_flow_json",
    {
      title: "Baixar Flow JSON atual",
      description:
        "Busca os assets do flow e baixa o conteúdo do Flow JSON atual (útil para editar ou clonar um flow publicado).",
      inputSchema: { flow_id: flowIdSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().assets(flow_id);
        const url = findDownloadUrl(res.resource);
        if (!url) return ok(res.resource ?? res, "Nenhuma download_url encontrada nos assets.");
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Falha ao baixar Flow JSON (HTTP ${r.status}).`);
        const text = await r.text();
        try {
          return ok(JSON.parse(text));
        } catch {
          return { content: [{ type: "text", text }] };
        }
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "publish_flow",
    {
      title: "Publicar flow",
      description:
        "Publica o flow. IRREVERSÍVEL: depois de publicado, o flow não pode ser editado nem excluído (apenas depreciado). " +
        "Só chame com confirmação explícita do usuário e após conferir que não há validation_errors.",
      inputSchema: {
        flow_id: flowIdSchema,
        confirm: z.literal(true).describe("Deve ser true, confirmando que o usuário autorizou a publicação."),
      },
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().publish(flow_id);
        return ok(res.resource ?? res, "Flow publicado.");
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "deprecate_flow",
    {
      title: "Depreciar flow",
      description: "Deprecia um flow PUBLICADO; ele não poderá mais ser enviado. Irreversível.",
      inputSchema: {
        flow_id: flowIdSchema,
        confirm: z.literal(true).describe("Deve ser true, confirmando que o usuário autorizou."),
      },
      annotations: { destructiveHint: true },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().deprecate(flow_id);
        return ok(res.resource ?? res, "Flow depreciado.");
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "delete_flow",
    {
      title: "Excluir flow",
      description: "Exclui um flow que NUNCA foi publicado (DRAFT). Para flows publicados, use deprecate_flow.",
      inputSchema: {
        flow_id: flowIdSchema,
        confirm: z.literal(true).describe("Deve ser true, confirmando que o usuário autorizou a exclusão."),
      },
      annotations: { destructiveHint: true },
    },
    async ({ flow_id }) => {
      try {
        const res = await getApi().delete(flow_id);
        return ok(res.resource ?? res, "Flow excluído.");
      } catch (e) {
        return fail(e);
      }
    }
  );

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
          .describe("Chave pública em formato PEM (-----BEGIN PUBLIC KEY----- ...)."),
      },
    },
    async ({ public_key }) => {
      try {
        if (!public_key.includes("BEGIN PUBLIC KEY")) {
          throw new Error("A chave deve estar em formato PEM, começando com '-----BEGIN PUBLIC KEY-----'.");
        }
        const res = await getApi().uploadPublicKey(public_key);
        return ok(res.resource ?? res, "Chave pública enviada.");
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "create_flow_with_json",
    {
      title: "Criar flow completo",
      description:
        "Atalho: valida o Flow JSON, cria o flow (DRAFT), envia o JSON e retorna os detalhes (status, " +
        "validation_errors e link de preview). Não publica.",
      inputSchema: {
        name: z.string().min(1).max(200),
        categories: categoriesSchema,
        flow_json: flowJsonSchema,
      },
    },
    async ({ name, categories, flow_json }) => {
      try {
        const parsed = parseFlowJson(flow_json);
        const validation = validateFlowJson(parsed);
        if (!validation.valid) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Flow não criado: corrija os erros de validação.\n\n" + JSON.stringify(validation, null, 2),
            }],
          };
        }
        const flowsApi = getApi();
        const created = await flowsApi.create(name, categories);
        const flowId = extractFlowId(created.resource);
        if (!flowId) {
          return ok(created.resource ?? created, "Flow criado, mas não foi possível identificar o ID na resposta.");
        }
        const upload = await flowsApi.uploadFlowJson(flowId, parsed);
        const details = await flowsApi.get(flowId).catch((e: Error) => ({ resource: { error: e.message } }));
        return ok(
          {
            flow_id: flowId,
            upload: upload.resource ?? upload,
            details: details.resource,
            first_screen: validation.summary.screens[0],
            local_validation_warnings: validation.warnings,
          },
          `Flow criado em DRAFT (flow_id = ${flowId}). Revise o preview antes de publicar.`
        );
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ------------------------------------------------------------------ tools: offline
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
    async ({ flow_json }) => ok(validateFlowJson(flow_json))
  );

  server.registerTool(
    "build_flow_message",
    {
      title: "Gerar mensagem de envio do flow",
      description:
        "Gera o JSON de mensagem interativa do tipo 'flow' para colar em um Conteúdo Dinâmico no Builder da Blip " +
        "(ou enviar como application/json). Não chama a API.",
      inputSchema: {
        flow_id: flowIdSchema,
        first_screen: z.string().optional().describe("ID da primeira tela do Flow JSON (obrigatório para navigate)."),
        cta: z.string().min(1).max(20).describe("Texto do botão que abre o flow (máx. 20 caracteres)."),
        body: z.string().min(1).max(1024).describe("Texto do corpo da mensagem."),
        header: z.string().max(60).optional(),
        footer: z.string().max(60).optional(),
        flow_token: z.string().optional().describe("Token para correlacionar a resposta (padrão: UUID). Pode usar variáveis do Builder, ex.: {{contact.identity}}."),
        initial_data: z.record(z.any()).optional().describe("Dados iniciais enviados para a primeira tela (devem estar declarados em screen.data)."),
        draft_mode: z.boolean().optional().describe("true para testar um flow ainda em DRAFT."),
        flow_action: z.enum(["navigate", "data_exchange"]).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (a) => {
      try {
        return ok(
          buildFlowMessage({
            flowId: a.flow_id,
            firstScreen: a.first_screen,
            cta: a.cta,
            body: a.body,
            headerText: a.header,
            footerText: a.footer,
            flowToken: a.flow_token,
            initialData: a.initial_data,
            draftMode: a.draft_mode,
            flowAction: a.flow_action,
          }),
          "Cole este JSON em um bloco do Builder > Conteúdo Dinâmico."
        );
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "get_flow_json_example",
    {
      title: "Exemplo de Flow JSON",
      description: `Retorna um Flow JSON de exemplo. Disponíveis: ${listExamples().join(", ") || "(nenhum)"}.`,
      inputSchema: {
        name: z.string().optional().describe("Nome do arquivo de exemplo; omita para listar."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      const files = listExamples();
      if (!name) return ok({ examples: files });
      const file = files.find((f) => f === name || f === `${name}.json`);
      if (!file) return fail(new Error(`Exemplo '${name}' não encontrado. Disponíveis: ${files.join(", ")}`));
      return { content: [{ type: "text", text: readFileSync(join(EXAMPLES_DIR, file), "utf8") }] };
    }
  );

  // ------------------------------------------------------------------ resources
  server.registerResource(
    "blip-commands-reference",
    "blip://docs/commands",
    {
      title: "Referência dos commands de WhatsApp Flows na Blip",
      description: "URIs, métodos, ciclo de vida e envio pelo Builder.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: BLIP_COMMANDS_REFERENCE }] })
  );

  server.registerResource(
    "flow-json-reference",
    "blip://docs/flow-json",
    {
      title: "Guia do Flow JSON",
      description: "Estrutura, componentes, ações e boas práticas do Flow JSON do WhatsApp.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: FLOW_JSON_REFERENCE }] })
  );

  for (const file of listExamples()) {
    server.registerResource(
      `example-${file.replace(/\.json$/, "")}`,
      `blip://examples/${file}`,
      { title: `Exemplo: ${file}`, description: "Flow JSON de exemplo válido.", mimeType: "application/json" },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: "application/json", text: readFileSync(join(EXAMPLES_DIR, file), "utf8") }],
      })
    );
  }

  // ------------------------------------------------------------------ prompts
  server.registerPrompt(
    "design_whatsapp_flow",
    {
      title: "Projetar um WhatsApp Flow",
      description: "Guia o modelo para projetar, validar e criar um WhatsApp Flow na Blip a partir de um objetivo.",
      argsSchema: {
        objetivo: z.string().describe("O que o flow deve fazer (ex.: agendamento de consulta)."),
        campos: z.string().optional().describe("Campos/informações a coletar, separados por vírgula."),
        categoria: z.string().optional().describe(`Categoria: ${FLOW_CATEGORIES.join(", ")}.`),
      },
    },
    ({ objetivo, campos, categoria }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text:
            `Quero criar um WhatsApp Flow na Blip.\n\nObjetivo: ${objetivo}\n` +
            (campos ? `Campos a coletar: ${campos}\n` : "") +
            (categoria ? `Categoria: ${categoria}\n` : "") +
            `\nSiga estes passos:\n` +
            `1. Leia os recursos blip://docs/flow-json e blip://docs/commands.\n` +
            `2. Proponha as telas (ids em MAIÚSCULAS) e os componentes de cada uma, em português, e me mostre o plano.\n` +
            `3. Escreva o Flow JSON (version "6.3", sem endpoint, salvo se eu pedir) e valide com validate_flow_json até não haver erros.\n` +
            `4. Com minha aprovação, use create_flow_with_json e mostre o flow_id, os validation_errors e o link de preview.\n` +
            `5. Gere o JSON de envio com build_flow_message (draft_mode=true para testes).\n` +
            `6. NÃO publique sem minha confirmação explícita.`,
        },
      }],
    })
  );

  return server;
}
