import { randomUUID } from "node:crypto";

/** Limites de texto da mensagem interativa definidos pela Meta. */
export const FLOW_MESSAGE_LIMITS = {
  cta: 20,
  body: 1024,
  header: 60,
  footer: 60,
} as const;

export type FlowAction = "navigate" | "data_exchange";

export interface FlowMessageOptions {
  flowId: string;
  cta: string;
  body: string;
  firstScreen?: string;
  header?: string;
  footer?: string;
  flowToken?: string;
  initialData?: Record<string, unknown>;
  draftMode?: boolean;
  flowAction?: FlowAction;
}

/**
 * Gera a mensagem interativa do tipo "flow" usada no Conteúdo Dinâmico do Builder da Blip
 * (formato do artigo "Como exibir os seus Flows usando conteúdo dinâmico no Builder").
 */
export function buildFlowMessage(options: FlowMessageOptions): Record<string, unknown> {
  assertTextLimits(options);
  const flowAction = options.flowAction ?? "navigate";

  return {
    recipient_type: "individual",
    messaging_product: "whatsapp",
    type: "interactive",
    interactive: {
      type: "flow",
      ...(options.header ? { header: { type: "text", text: options.header } } : {}),
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      action: { name: "flow", parameters: buildParameters(options, flowAction) },
    },
  };
}

function buildParameters(options: FlowMessageOptions, flowAction: FlowAction): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    flow_message_version: "3",
    flow_token: options.flowToken ?? randomUUID(),
    flow_id: options.flowId,
    flow_cta: options.cta,
    flow_action: flowAction,
  };
  if (options.draftMode) parameters.mode = "draft";
  if (flowAction === "navigate") parameters.flow_action_payload = buildNavigatePayload(options);
  return parameters;
}

function buildNavigatePayload(options: FlowMessageOptions): Record<string, unknown> {
  if (!options.firstScreen) {
    throw new Error("first_screen é obrigatório quando flow_action = navigate.");
  }
  const hasInitialData = options.initialData && Object.keys(options.initialData).length > 0;
  return { screen: options.firstScreen, ...(hasInitialData ? { data: options.initialData } : {}) };
}

function assertTextLimits(options: FlowMessageOptions): void {
  const checks: Array<[keyof typeof FLOW_MESSAGE_LIMITS, string | undefined]> = [
    ["cta", options.cta],
    ["body", options.body],
    ["header", options.header],
    ["footer", options.footer],
  ];
  for (const [field, text] of checks) {
    const limit = FLOW_MESSAGE_LIMITS[field];
    if (text && text.length > limit) {
      throw new Error(`${field} deve ter no máximo ${limit} caracteres.`);
    }
  }
}
