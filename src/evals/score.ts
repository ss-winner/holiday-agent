// 评分规则：纯函数，可单独测试。规则越具体，分数越有说服力。
import type { AgentResult } from "../agent/agent.js";

export interface EvalCase {
  id: string;
  question: string;
  expectTools?: string[]; // 这些工具必须被调用
  mustIncludeAll?: string[]; // 回答必须包含全部
  mustIncludeAny?: string[]; // 回答至少包含其一
  mustNotInclude?: string[]; // 回答不能出现
  maxToolCalls?: number;   // 新增：工具调用次数上限
  rubric?: string;   // 新增：用自然语言写的评分标准，有它才会请评委
}

export interface EvalOutcome {
  id: string;
  pass: boolean;
  reasons: string[]; // 没通过的原因
}

export function scoreCase(c: EvalCase, r: AgentResult): EvalOutcome {
  const reasons: string[] = [];
  const answer = r.answer.replace(/(\d),(?=\d{3}\b)/g, "$1");   // 新增：7,899 → 7899
  const called = new Set(r.toolCalls.map((t) => t.name));
  for (const t of c.expectTools ?? []) if (!called.has(t)) reasons.push(`没有调用工具 ${t}`);
  for (const s of c.mustIncludeAll ?? []) if (!answer.includes(s)) reasons.push(`回答缺少「${s}」`);
  if (c.mustIncludeAny?.length && !c.mustIncludeAny.some((s) => answer.includes(s)))
    reasons.push(`回答没有出现以下任一内容：${c.mustIncludeAny.join(" / ")}`);
  for (const s of c.mustNotInclude ?? []) if (answer.includes(s)) reasons.push(`回答不应出现「${s}」`);
  if (c.maxToolCalls !== undefined && r.toolCalls.length > c.maxToolCalls)
  reasons.push(`工具调用 ${r.toolCalls.length} 次，超过上限 ${c.maxToolCalls} 次`);
  return { id: c.id, pass: reasons.length === 0, reasons };
}

// TODO(第8天)：关键词规则判断不了"回答好不好"，可以再加一个"让大模型当评委"的打分（LLM-as-judge）
