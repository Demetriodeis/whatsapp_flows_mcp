import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BlipConfigOverrides } from "../config/blipConfig.js";
import type { WhatsAppFlowsApi } from "../flows/flowsApi.js";
import { createToolContext, createToolContextFromApi } from "./context.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { SERVER_INSTRUCTIONS, SERVER_NAME, SERVER_VERSION } from "./serverInfo.js";
import { registerAllTools } from "./tools/index.js";

export interface CreateServerOptions {
  /** API já construída (útil em testes). */
  flowsApi?: WhatsAppFlowsApi;
  /** Overrides de configuração da Blip (ex.: credenciais por requisição HTTP). */
  configOverrides?: BlipConfigOverrides;
}

/** Monta o servidor MCP com todas as tools, resources e prompts. Independe do transporte. */
export function createServer(options: CreateServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const context = options.flowsApi
    ? createToolContextFromApi(options.flowsApi)
    : createToolContext(options.configOverrides);

  registerAllTools(server, context);
  registerResources(server);
  registerPrompts(server);
  return server;
}
