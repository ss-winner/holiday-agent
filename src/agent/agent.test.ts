// 用一个本地"假模型"服务器测试 Agent 循环，不花 API 费用、也不需要网络。
// 预期结果从真实数据算出来，不写死，所以改 products.ts 不会让测试失败。
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { runAgent, type ToolProvider } from "./agent.js";
import { lowStockAlert } from "../mcp-server/tools.js";
import { scoreCase } from "../evals/score.js";

// 阈值设得很大，保证不管什么数据都能查到结果
const ARGS = { threshold: 9999 };

// 假模型：第一轮要求调用 low_stock_alert，第二轮根据工具结果作答
function fakeModel() {
  const seen: unknown[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { messages } = JSON.parse(body);
      seen.push(messages);
      const last = messages.at(-1);
      const message =
        last.role === "user"
          ? {
              content: "<think>需要先查库存</think>",
              tool_calls: [
                { id: "call_1", type: "function", function: { name: "low_stock_alert", arguments: JSON.stringify(ARGS) } },
              ],
            }
          : { content: `<think>整理结果</think>最早的是 ${JSON.parse(last.content)[0].id}。` };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ choices: [{ message }] }));
    });
  });
  return { server, seen };
}

const localTools: ToolProvider = {
  async list() {
    return [{ type: "function", function: { name: "low_stock_alert", parameters: { type: "object" } } }];
  },
  async call(name, args) {
    if (name !== "low_stock_alert") throw new Error("unknown tool");
    return JSON.stringify(lowStockAlert(args));
  },
};

test("Agent 能完成 调用工具 → 拿到结果 → 作答 的完整循环", async () => {
  const expectedId = lowStockAlert(ARGS)[0].id; // 从数据算出预期，而不是写死
  const { server, seen } = fakeModel();
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  try {
    const r = await runAgent(
      { apiKey: "test", baseUrl: `http://127.0.0.1:${port}/v1`, model: "fake" },
      localTools,
      "哪些班期快卖完了？",
    );
    assert.equal(r.steps, 2);
    assert.deepEqual(r.toolCalls.map((t) => t.name), ["low_stock_alert"]);
    assert.equal(r.answer, `最早的是 ${expectedId}。`); // <think> 已去掉
    // 第二轮请求里，assistant 消息必须原样保留（含 tool_calls 和思考内容）
    const second = seen[1] as { role: string; content: string; tool_calls?: unknown[] }[];
    const asst = second.find((m) => m.role === "assistant")!;
    assert.ok(asst.tool_calls?.length);
    assert.ok(asst.content.includes("<think>"));

    const o = scoreCase({ id: "x", question: "", expectTools: ["low_stock_alert"], mustIncludeAll: [expectedId] }, r);
    assert.equal(o.pass, true);
  } finally {
    server.close();
  }
});
