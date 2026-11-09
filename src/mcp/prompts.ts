import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FLOW_CATEGORIES } from "../flows/categories.js";

/** Prompts: roteiros prontos para o modelo conduzir tarefas comuns. */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "design_whatsapp_flow",
    {
      title: "Projetar um WhatsApp Flow",
      description:
        "Guia o modelo para projetar, validar e criar um WhatsApp Flow na Blip a partir de um objetivo.",
      argsSchema: {
        objetivo: z.string().describe("O que o flow deve fazer (ex.: agendamento de consulta)."),
        campos: z.string().optional().describe("Campos/informações a coletar, separados por vírgula."),
        categoria: z
          .string()
          .optional()
          .describe(`Categoria: ${FLOW_CATEGORIES.join(", ")}.`),
      },
    },
    ({ objetivo, campos, categoria }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: buildDesignPrompt(objetivo, campos, categoria) },
        },
      ],
    })
  );
}

function buildDesignPrompt(objective: string, fields?: string, category?: string): string {
  const context = [
    "Quero criar um WhatsApp Flow na Blip.",
    "",
    `Objetivo: ${objective}`,
    fields ? `Campos a coletar: ${fields}` : undefined,
    category ? `Categoria: ${category}` : undefined,
  ];
  const steps = [
    "",
    "Siga estes passos:",
    "1. Leia os recursos blip://docs/flow-json e blip://docs/commands.",
    "2. Proponha as telas (ids em MAIÚSCULAS) e os componentes de cada uma, em português, e me mostre o plano.",
    '3. Escreva o Flow JSON (version "6.3", sem endpoint, salvo se eu pedir) e valide com validate_flow_json até não haver erros.',
    "4. Com minha aprovação, use create_flow_with_json e mostre o flow_id, os validation_errors e o link de preview.",
    "5. Gere o JSON de envio com build_flow_message (draft_mode=true para testes).",
    "6. NÃO publique sem minha confirmação explícita.",
  ];
  return [...context, ...steps].filter((line) => line !== undefined).join("\n");
}
