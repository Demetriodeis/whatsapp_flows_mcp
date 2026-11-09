import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { registerEndpointTools } from "./endpointTools.js";
import { registerFlowJsonTools } from "./flowJsonTools.js";
import { registerFlowManagementTools } from "./flowManagementTools.js";
import { registerLifecycleTools } from "./lifecycleTools.js";
import { registerMessageTools } from "./messageTools.js";

export function registerAllTools(server: McpServer, context: ToolContext): void {
  registerFlowManagementTools(server, context);
  registerFlowJsonTools(server, context);
  registerLifecycleTools(server, context);
  registerEndpointTools(server, context);
  registerMessageTools(server);
}
