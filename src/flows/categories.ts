/** Categorias aceitas pela Meta para WhatsApp Flows (ao menos uma é obrigatória). */
export const FLOW_CATEGORIES = [
  "SIGN_UP",
  "SIGN_IN",
  "APPOINTMENT_BOOKING",
  "LEAD_GENERATION",
  "CONTACT_US",
  "CUSTOMER_SUPPORT",
  "SURVEY",
  "OTHER",
] as const;

export type FlowCategory = (typeof FLOW_CATEGORIES)[number];
