// 用 MCP 客户端连接我们自己的 MCP 服务器，把它的工具转换成大模型能理解的格式。

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolProvider } from "./agent.js";

export async function connectMcp(): Promise<ToolProvider & { close(): Promise<void> }> {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp-server/index.ts"],
  });
  const client = new Client({ name: "supplier-workbench-agent", version: "0.2.0" });
  await client.connect(transport);

  return {
    async list() {
      const { tools } = await client.listTools();
      return tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }));
    },
    async call(name, args) {
      const res = await client.callTool({ name, arguments: args });
      const content = res.content as { type: string; text?: string }[];
      return content.map((c) => c.text ?? "").join("\n");
    },
    close: () => client.close(),
  };
}
