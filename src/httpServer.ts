#!/usr/bin/env node
/**
 * Servidor HTTP local (sem Azure Functions Core Tools) para testar o modo remoto.
 * Uso: PORT=3000 node dist/httpServer.js  ->  POST http://localhost:3000/mcp
 * Também serve para hospedar em container / App Service.
 */
import { createServer as createHttpServer } from "node:http";
import { handleMcpRequest } from "./httpHandler.js";

const port = Number(process.env.PORT ?? 3000);

createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"status":"ok"}');
      return;
    }
    if (url.pathname !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(", "));
    }
    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
    });
    const webRes = await handleMcpRequest(webReq);
    const outHeaders: Record<string, string> = {};
    webRes.headers.forEach((v, k) => (outHeaders[k] = v));
    res.writeHead(webRes.status, outHeaders).end(Buffer.from(await webRes.arrayBuffer()));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  }
}).listen(port, () => console.error(`[whatsapp-flows-blip] MCP HTTP em http://localhost:${port}/mcp`));
