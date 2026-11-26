import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type ToolCall = { name: string; args: Record<string, unknown> };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  steps?: number;
  ms?: number; // 这次回答花了多少毫秒
  error?: boolean;
};

// 演示用的示例问题：覆盖正常查询、含糊提问、录入校验、越权请求
const EXAMPLES = [
  "11月哪些班期快卖完了？",
  "查找过期产品",
  "三亚那个产品还有没有库存？",
  "查询P1009商品九月的价格",
  "帮我校验：标题「上海迪士尼1日1晚跟团游 qwewqewqe」，跟团游，目的地杭州，1天1晚，含门票，班期2026-12-20，价格899，库存10",
  "把 P1003 的价格改成 3000",
];

// 工具名对应的中文说明，没有的就只显示英文名
const TOOL_LABELS: Record<string, string> = {
  list_products: "列出商品",
  get_product_detail: "商品详情",
  low_stock_alert: "库存预警",
  validate_product_draft: "录入校验",
  price_calendar: "价格日历",
};

export default function App() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem("accessPassword") ?? "";
    } catch {
      return "";
    }
  });

  function savePassword(value: string) {
    setPassword(value);
    try {
      localStorage.setItem("accessPassword", value);
    } catch {
      /* 浏览器禁用存储时忽略 */
    }
  }

  // 有新消息或进入加载状态时，自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Password": password },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setSessionId(data.sessionId); // 保存下来，下次提问时带上，实现多轮对话
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          toolCalls: data.toolCalls,
          steps: data.steps,
          ms: Date.now() - t0,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `出错了：${(e as Error).message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setMessages([]);
    setSessionId(undefined); // 清空 sessionId，后端会当成一段新对话
  }

  // Enter 发送，Shift+Enter 换行；中文输入法正在选字时按 Enter 不发送
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(input);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>度假供应商工作台助手</h1>
          <p className="subtitle">MCP + MiniMax Agent · 只能查询和校验，不能修改数据</p>
        </div>
        <input
          type="password"
          className="pwd"
          placeholder="访问密码"
          value={password}
          onChange={(e) => savePassword(e.target.value)}
        />
        <button className="ghost" onClick={newChat} disabled={loading}>
          新对话
        </button>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <p>试试这些问题：</p>
            <div className="examples">
              {EXAMPLES.map((q) => (
                <button key={q} className="example" onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} msg={m} />
        ))}

        {loading && (
          <div className="msg assistant">
            <div className="bubble loading">
              正在查询<span className="dots" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          rows={2}
          disabled={loading}
        />
        <button onClick={() => ask(input)} disabled={loading || !input.trim()}>
          发送
        </button>
      </footer>
    </div>
  );
}

function Message({ msg }: { msg: ChatMsg }) {
  if (msg.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="msg assistant">
      {/* 工具调用放在回答前面，按发生的先后顺序展示 */}
      {msg.toolCalls && <ToolCalls calls={msg.toolCalls} />}
      <div className={`bubble${msg.error ? " error" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>
      {msg.steps !== undefined && (
        <div className="meta">
          {msg.steps} 轮 · {msg.toolCalls?.length ?? 0} 次工具调用 ·{" "}
          {((msg.ms ?? 0) / 1000).toFixed(1)} 秒
        </div>
      )}
    </div>
  );
}

function ToolCalls({ calls }: { calls: ToolCall[] }) {
  // 没调用工具也要显示出来：比如越权请求时，Agent 直接拒绝，不应该调用任何工具
  if (calls.length === 0) {
    return <div className="tools none">未调用工具</div>;
  }

  return (
    <details className="tools" open>
      <summary>调用了 {calls.length} 次工具</summary>
      <ol>
        {calls.map((c, i) => (
          <li key={i}>
            <span className="tool-name">{c.name}</span>
            {TOOL_LABELS[c.name] && <span className="tool-label">{TOOL_LABELS[c.name]}</span>}
            <pre>
              {Object.keys(c.args).length ? JSON.stringify(c.args, null, 2) : "（无参数）"}
            </pre>
          </li>
        ))}
      </ol>
    </details>
  );
}
