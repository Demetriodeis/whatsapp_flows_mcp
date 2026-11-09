import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listExampleFiles, readExample, readReferenceDoc, REFERENCE_DOCS } from "./content.js";

const MARKDOWN = "text/markdown";
const JSON_MIME = "application/json";

/** Resources: documentação de referência e exemplos de Flow JSON. */
export function registerResources(server: McpServer): void {
  registerMarkdownDoc(server, {
    name: "blip-commands-reference",
    uri: "blip://docs/commands",
    title: "Referência dos commands de WhatsApp Flows na Blip",
    description: "URIs, métodos, ciclo de vida e envio pelo Builder.",
    fileName: REFERENCE_DOCS.commands,
  });

  registerMarkdownDoc(server, {
    name: "flow-json-reference",
    uri: "blip://docs/flow-json",
    title: "Guia do Flow JSON",
    description: "Estrutura, componentes, ações e boas práticas do Flow JSON do WhatsApp.",
    fileName: REFERENCE_DOCS.flowJson,
  });

  for (const fileName of listExampleFiles()) {
    server.registerResource(
      `example-${fileName.replace(/\.json$/, "")}`,
      `blip://examples/${fileName}`,
      { title: `Exemplo: ${fileName}`, description: "Flow JSON de exemplo válido.", mimeType: JSON_MIME },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: JSON_MIME, text: readExample(fileName) ?? "" }],
      })
    );
  }
}

interface MarkdownDoc {
  name: string;
  uri: string;
  title: string;
  description: string;
  fileName: string;
}

function registerMarkdownDoc(server: McpServer, doc: MarkdownDoc): void {
  server.registerResource(
    doc.name,
    doc.uri,
    { title: doc.title, description: doc.description, mimeType: MARKDOWN },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MARKDOWN, text: readReferenceDoc(doc.fileName) }],
    })
  );
}
