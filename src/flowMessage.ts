import { randomUUID } from "node:crypto";

export interface FlowMessageOptions {
  flowId: string;
  firstScreen?: string;
  cta: string;
  body: string;
  headerText?: string;
  footerText?: string;
  flowToken?: string;
  initialData?: Record<string, unknown>;
  draftMode?: boolean;
  flowAction?: "navigate" | "data_exchange";
}

/**
 * Gera o JSON do conteúdo dinâmico (Builder da Blip) / mensagem interativa do tipo "flow".
 * Formato documentado no Blip Help ("Como exibir os seus Flows usando conteúdo dinâmico no Builder").
 */
export function buildFlowMessage(o: FlowMessageOptions): Record<string, unknown> {
  if (o.cta.length > 20) throw new Error("flow_cta deve ter no máximo 20 caracteres.");
  if (o.body.length > 1024) throw new Error("body deve ter no máximo 1024 caracteres.");
  if (o.headerText && o.headerText.length > 60) throw new Error("header deve ter no máximo 60 caracteres.");
  if (o.footerText && o.footerText.length > 60) throw new Error("footer deve ter no máximo 60 caracteres.");

  const flowAction = o.flowAction ?? "navigate";
  if (flowAction === "navigate" && !o.firstScreen) {
    throw new Error("first_screen é obrigatório quando flow_action = navigate.");
  }

  const parameters: Record<string, unknown> = {
    flow_message_version: "3",
    flow_token: o.flowToken ?? randomUUID(),
    flow_id: o.flowId,
    flow_cta: o.cta,
    flow_action: flowAction,
  };
  if (o.draftMode) parameters.mode = "draft";
  if (flowAction === "navigate") {
    const payload: Record<string, unknown> = { screen: o.firstScreen };
    if (o.initialData && Object.keys(o.initialData).length > 0) payload.data = o.initialData;
    parameters.flow_action_payload = payload;
  }

  const interactive: Record<string, unknown> = { type: "flow" };
  if (o.headerText) interactive.header = { type: "text", text: o.headerText };
  interactive.body = { text: o.body };
  if (o.footerText) interactive.footer = { text: o.footerText };
  interactive.action = { name: "flow", parameters };

  return {
    recipient_type: "individual",
    messaging_product: "whatsapp",
    type: "interactive",
    interactive,
  };
}
