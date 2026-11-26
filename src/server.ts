// 启动：npm run server
import http from "node:http";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config.js";
import { runAgent } from "./agent/agent.js";
import { connectMcp } from "./agent/mcp-provider.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

// 访问密码：在 .env 里设置 ACCESS_PASSWORD
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD ?? "";
if (!ACCESS_PASSWORD) console.warn("⚠️ 没有设置 ACCESS_PASSWORD，接口没有任何访问限制");

function passwordOk(req: http.IncomingMessage) {
  const given = Buffer.from(String(req.headers["x-access-password"] ?? ""));
  const expected = Buffer.from(ACCESS_PASSWORD);
  // timingSafeEqual 比较时间固定，别人没法通过响应时间的长短来猜密码
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// 每日调用上限：就算密码泄露，一天最多也只会调用这么多次
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT ?? 200);
let usage = { day: "", count: 0 };
function overDailyLimit() {
  const today = new Date().toISOString().slice(0, 10);
  if (usage.day !== today) usage = { day: today, count: 0 }; // 新的一天，计数清零
  return usage.count >= DAILY_LIMIT;
}

const DIST = path.resolve("web/dist"); // 前端打包后的目录
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const file = path.join(DIST, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    return res.end(); // 防止用 ../ 访问服务器上的其他文件
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    const html = await readFile(path.join(DIST, "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(html);
  }
}

const PORT = Number(process.env.PORT ?? 3000);
const cfg = loadConfig();
const tools = await connectMcp();              // 启动时连接一次MCP服务器，所有请求共用

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",            // 允许前端开发服务器跨域访问
  "Access-Control-Allow-Headers": "Content-Type, X-Access-Password",
};

function send(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

async function readJson(req: http.IncomingMessage) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || "{}");
}

const server = http.createServer(async (req, res) => {
  // 浏览器跨域时会先发一个 OPTIONS 预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    
    if (ACCESS_PASSWORD && !passwordOk(req)) {
      return send(res, 401, { error: "访问密码错误" });
    }
    if (overDailyLimit()) {
      return send(res, 429, { error: "今日调用次数已达上限，请明天再试" });
    }
    usage.count++;

    try {
      const { question, sessionId } = await readJson(req);
      if (typeof question !== "string" || !question.trim()) {
        return send(res, 400, { error: "缺少 question" });
      }
      const id = sessionId || randomUUID();
      const r = await runAgent(cfg, tools, question);
      return send(res, 200, { sessionId: id, answer: r.answer, toolCalls: r.toolCalls, steps: r.steps });
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: String(e) });
    }
  }

  if (req.method === "GET" && !req.url?.startsWith("/api/")) {
    return serveStatic(req, res);
  }
  send(res, 404, { error: "Not Found" });
});

server.listen(PORT, () => console.log(`Agent 接口已启动：http://localhost:${PORT}/api/chat`));