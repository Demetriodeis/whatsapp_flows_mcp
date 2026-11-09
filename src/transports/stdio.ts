#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../mcp/createServer.js";
import { SERVER_NAME } from "../mcp/serverInfo.js";

/** Entrada para clientes locais (Claude Desktop, Claude Code, Inspector). */
async function main(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  // stdout é reservado ao protocolo MCP; logs vão para stderr.
  console.error(`[${SERVER_NAME}] servidor MCP iniciado (stdio)`);
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] erro fatal:`, error);
  process.exit(1);
});
