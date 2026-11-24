// 调用 MiniMax 的 OpenAI 兼容接口。直接用 fetch，不依赖额外 SDK，方便看清楚请求长什么样。

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolSpec {
  type: "function";
  function: { name: string; description?: string; parameters: unknown };
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export async function chat(cfg: LlmConfig, messages: Message[], tools: ToolSpec[]) {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages, ...(tools.length ? { tools } : {}), temperature: 1.0 }),
  });
  if (!res.ok) throw new Error(`MiniMax API 错误 ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[];
  };
  return data.choices[0].message;
}

/** MiniMax 部分模型会在 content 里带 <think>…</think> 思考过程：展示给用户时去掉，但历史消息里要原样保留 */
export const stripThinking = (s: string | null) => (s ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
