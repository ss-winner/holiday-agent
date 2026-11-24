// 启动：npm run server
import http from "node:http";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config.js";
import { runAgent } from "./agent/agent.js";
import { connectMcp } from "./agent/mcp-provider.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

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
  "Access-Control-Allow-Headers": "Content-Type",
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