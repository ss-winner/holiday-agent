// Agent 核心循环：模型决定调用哪个工具 → 执行工具 → 把结果交回模型 → 直到模型给出最终回答。
// 工具来源抽象成 ToolProvider：正式运行时连 MCP 服务器，测试时可以直接用本地函数。

import { chat, stripThinking, type LlmConfig, type Message, type ToolSpec } from "./llm.js";

export interface ToolProvider {
  list(): Promise<ToolSpec[]>;
  call(name: string, args: Record<string, unknown>): Promise<string>;
}

export interface AgentResult {
  answer: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  steps: number;
}

// TODO(第5天)：这里是 Prompt 工程的主战场。改完跑一遍 npm run eval，看分数变化并记录下来
export const SYSTEM_PROMPT = `你是度假产品供应商的工作台助手，帮供应商查看自己的商品、关注库存、在录入新商品前做校验。
今天是 ${new Date().toISOString().slice(0, 10)}。
规则：
- 涉及具体商品、价格、班期、库存时，必须先调用工具查询，不能凭空编造。
- 提到商品时写出商品 ID 和标题；提到班期时写出日期和库存。
- 录入校验时，先列"必须修改"的问题，再列"建议核实"的问题；材料里没有的信息不要替供应商编。
- 你只能查询和校验，不能修改价格、库存或提交商品。被要求修改时，说明做不到，请供应商到商品管理后台操作。
- 回答简洁，用中文。`;

export async function runAgent(
  cfg: LlmConfig,
  tools: ToolProvider,
  question: string,
  opts: { maxSteps?: number; systemPrompt?: string } = {},
): Promise<AgentResult> {
  const specs = await tools.list();
  const messages: Message[] = [
    { role: "system", content: opts.systemPrompt ?? SYSTEM_PROMPT },
    { role: "user", content: question },
  ];
  const toolCalls: AgentResult["toolCalls"] = [];
  const maxSteps = opts.maxSteps ?? 8;

  for (let step = 1; step <= maxSteps; step++) {
    const msg = await chat(cfg, messages, specs);
    // 必须把完整的 assistant 消息（含 tool_calls 和思考内容）放回历史，MiniMax 文档特别强调这一点
    messages.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });
    // console.error(`\n[第${step}轮思考]`, msg.content);
    if (!msg.tool_calls?.length) {
      return { answer: stripThinking(msg.content), toolCalls, steps: step };
    }
    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        /* 模型偶尔会给出非法 JSON，这里按空参数处理，结果里会体现错误 */
      }
      toolCalls.push({ name: tc.function.name, args });
      const result = await tools.call(tc.function.name, args).catch((e) => `工具调用失败：${e}`);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }
  return { answer: "（超过最大步数，Agent 未能给出回答）", toolCalls, steps: maxSteps };
}
