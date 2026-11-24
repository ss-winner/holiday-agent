// MCP 服务器：把 tools.ts 里的业务函数暴露成大模型可调用的工具。
// 通过 stdio 通信，Claude Code、Cursor 等任何 MCP 客户端都能直接接入。

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listProducts, getProductDetail, lowStockAlert, validateDraft,getProductPriceCalendar } from "./tools.js";

const server = new McpServer({ name: "supplier-workbench", version: "0.2.0" });

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const productType = z.enum(["跟团游", "自由行", "半自助", "邮轮", "私家团"]);

// 工具描述写给大模型看：写清楚"什么时候用、参数什么意思"，直接影响 Agent 的效果
server.registerTool(
  "list_products",
  {
    title: "列出我的商品",
    description: `列出本供应商的商品概况：班期数、最低价、剩余总库存、已售罄班期，以及过期班期（出发日期早于今天）的日期。可按目的地、类型、最高价筛选。
    供应商问"我有哪些商品""XX的产品卖多少钱""哪些产品过期了"时使用。结果已包含过期班期的完整信息，不需要再调用其他工具核对。`,
    inputSchema: {
      destination: z.string().optional().describe("目的地，如 三亚、云南、日本"),
      type: productType.optional(),
      maxPrice: z.number().optional().describe("只看最低价不超过该值的商品（元/人）"),
    },
  },
  async (args) => json(listProducts(args)),
);

server.registerTool(
  "get_product_detail",
  {
    title: "查看商品详情",
    description: "根据商品 ID 查看完整信息：费用包含/不含、每个班期的价格和剩余库存。",
    inputSchema: { id: z.string().describe("商品 ID，如 P1001") },
  },
  async ({ id }) => json(getProductDetail(id) ?? { error: `找不到商品 ${id}` }),
);

server.registerTool(
  "low_stock_alert",
  {
    title: "库存预警",
    description:
      `找出库存紧张或已售罄的班期，按出发日期排序。供应商问'哪些班期快卖完了''需要补库存吗'时使用。`,
    inputSchema: {
      threshold: z.number().int().optional().describe("库存小于等于该值即预警，默认 5"),
      startDate: z.string().optional().describe("出发日期起 YYYY-MM-DD"),
      endDate: z.string().optional().describe("出发日期止 YYYY-MM-DD"),
    },
  },
  async (args) => json(lowStockAlert(args)),
);

server.registerTool(
  "validate_product_draft",
  {
    title: "校验商品录入草稿",
    description:
      "供应商录入新商品前，校验字段是否完整、格式是否正确，返回 errors（必须修改）和 warnings（建议核实）。只做校验，不会真正入库。",
    inputSchema: {
      title: z.string().optional(),
      type: productType.optional(),
      destination: z.string().optional(),
      days: z.number().int().optional(),
      nights: z.number().int().optional().describe("住宿晚数"),
      includes: z.array(z.string()).optional().describe("费用包含"),
      departures: z
        .array(z.object({ date: z.string(), price: z.number(), stock: z.number() }))
        .optional()
        .describe("班期列表：出发日期、价格（元/人）、库存"),
    },
  },
  async (args) => json(validateDraft(args)),
);

server.registerTool(
  "price_calendar",
  {
    title: "查看商品价格日历",
    description: "根据商品 ID 和月份查看该商品在指定月份的班期价格。",
    inputSchema: {
      id: z.string().describe("商品 ID，如 P1001"),
      month: z.string().describe("月份，格式为MM"),
    },
  },
  async ({ id, month }) => json(getProductPriceCalendar(id, month)),
);

await server.connect(new StdioServerTransport());
// 注意：stdio 模式下不能用 console.log（会污染协议通道），调试信息用 console.error
console.error("supplier-workbench MCP server 已启动");
