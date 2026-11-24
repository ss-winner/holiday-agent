// 命令行对话：npm run chat
import readline from "node:readline/promises";
import { readFileSync } from "node:fs";
import { loadConfig } from "./config.js";
import { runAgent, SYSTEM_PROMPT } from "./agent/agent.js";
import { connectMcp } from "./agent/mcp-provider.js";

// 读取 Skill 的内容
const skill = readFileSync("skills/product-entry/SKILL.md", "utf8");

const cfg = loadConfig();
const tools = await connectMcp();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("供应商工作台助手已就绪，输入问题（输入 exit 退出）。例：11月哪些班期快卖完了？\n");

while (true) {
  const q = (await rl.question("你：")).trim();
  if (!q || q === "exit") break;
  try {
    const r = await runAgent(cfg, tools, q);
    // const r = await runAgent(cfg, tools, q, {
    //   systemPrompt: SYSTEM_PROMPT + "\n\n" + skill,
    // });
    for (const c of r.toolCalls) console.log(`  [调用工具] ${c.name} ${JSON.stringify(c.args)}`);
    console.log(`助手：${r.answer}\n`);
  } catch (e) {
    console.error(`出错了：${e}\n`);
  }
}
rl.close();
await tools.close();
