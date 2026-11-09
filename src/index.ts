#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout é reservado ao protocolo MCP; logs vão para stderr.
  console.error("[whatsapp-flows-blip] servidor MCP iniciado (stdio)");
}

main().catch((err) => {
  console.error("[whatsapp-flows-blip] erro fatal:", err);
  process.exit(1);
});
