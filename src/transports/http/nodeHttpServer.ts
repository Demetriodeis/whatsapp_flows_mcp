#!/usr/bin/env node
/**
 * Servidor HTTP local (sem Azure Functions Core Tools). Também serve para container/App Service.
 * Uso: PORT=3000 node dist/transports/http/nodeHttpServer.js  ->  POST http://localhost:3000/mcp
 *      (ou POST http://localhost:3000/mcp/b/{alias} para um bot cadastrado em BLIP_BOT_<ALIAS>_*)
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SERVER_NAME } from "../../mcp/serverInfo.js";
import { handleBotMcpRequest, handleMcpRequest } from "./mcpHttpHandler.js";

const DEFAULT_PORT = 3000;
const MCP_PATH = "/mcp";
const BOT_PATH = /^\/mcp\/b\/([^/]+)$/;
const HEALTH_PATH = "/health";

const port = Number(process.env.PORT ?? DEFAULT_PORT);

createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error(`[${SERVER_NAME}]`, error);
    if (!res.headersSent) res.writeHead(500).end();
  });
}).listen(port, () => console.error(`[${SERVER_NAME}] MCP HTTP em http://localhost:${port}${MCP_PATH}`));

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === HEALTH_PATH) {
    res.writeHead(200, { "Content-Type": "application/json" }).end('{"status":"ok"}');
    return;
  }
  const botAlias = BOT_PATH.exec(url.pathname)?.[1];
  if (url.pathname !== MCP_PATH && !botAlias) {
    res.writeHead(404).end();
    return;
  }
  const request = await toWebRequest(req, url);
  const response = botAlias
    ? await handleBotMcpRequest(request, decodeURIComponent(botAlias))
    : await handleMcpRequest(request);
  await writeWebResponse(response, res);
}

async function toWebRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const body = req.method === "POST" ? await readBody(req) : undefined;
  return new Request(url, { method: req.method, headers, body });
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => (headers[name] = value));
  res.writeHead(response.status, headers).end(Buffer.from(await response.arrayBuffer()));
}
