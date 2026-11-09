export const SERVER_NAME = "whatsapp-flows-blip";
export const SERVER_VERSION = "0.2.0";

export const SERVER_INSTRUCTIONS = [
  "Servidor MCP para construir e gerenciar WhatsApp Flows via API de Commands da Blip.",
  "Fluxo típico:",
  "1) leia os recursos 'blip://docs/flow-json' e 'blip://docs/commands' e os exemplos;",
  "2) escreva o Flow JSON e valide com validate_flow_json;",
  "3) create_flow_with_json (ou create_flow + upload_flow_json);",
  "4) get_flow para checar validation_errors e o link de preview;",
  "5) publish_flow somente com confirmação explícita do usuário (irreversível);",
  "6) build_flow_message para gerar o JSON de envio no Builder.",
].join(" ");
