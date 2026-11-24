import { chat, stripThinking, type LlmConfig } from "../agent/llm.js";
import type { AgentResult } from "../agent/agent.js";
import type { EvalCase } from "./score.js";

export interface JudgeResult {
  pass: boolean;
  score: number;
  reason: string;
}

const JUDGE_PROMPT = `你是一名严格的评审，负责评估"度假供应商工作台助手"的回答质量。
请根据给出的评分标准，判断助手的回答是否合格。
只输出一个 JSON 对象，不要输出任何其他内容：
{"pass": true 或 false, "score": 1 到 5 的整数, "reason": "一句话说明理由"}`;

export async function judge(cfg: LlmConfig, c: EvalCase, r: AgentResult): Promise<JudgeResult> {
  const tools = r.toolCalls.map((t) => `${t.name} ${JSON.stringify(t.args)}`).join("；") || "无";
  const content = `用户问题：${c.question}

评分标准：${c.rubric}

助手调用的工具：${tools}

助手的回答：
${r.answer}`;

  const msg = await chat(
    cfg,
    [
      { role: "system", content: JUDGE_PROMPT },
      { role: "user", content },
    ],
    [],
  );

  // 模型偶尔会在 JSON 前后多说几句，这里只取出 {...} 部分
  const text = stripThinking(msg.content);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { pass: false, score: 0, reason: `评委输出无法解析：${text.slice(0, 100)}` };
  try {
    const j = JSON.parse(m[0]);
    return { pass: j.pass === true, score: Number(j.score) || 0, reason: String(j.reason ?? "") };
  } catch {
    return { pass: false, score: 0, reason: `评委输出不是合法 JSON：${m[0].slice(0, 100)}` };
  }
}