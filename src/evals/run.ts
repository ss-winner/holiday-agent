// 跑评估：npm run eval  （可加 -- --tag 改prompt后 给这次结果打标签）
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { runAgent } from "../agent/agent.js";
import { connectMcp } from "../agent/mcp-provider.js";
import { scoreCase, type EvalCase, type EvalOutcome } from "./score.js";
import { judge, type JudgeResult } from "./judge.js";

const tagIdx = process.argv.indexOf("--tag");
const tag = tagIdx > -1 ? process.argv[tagIdx + 1] : "baseline";

const cases: EvalCase[] = JSON.parse(await readFile("evals/cases.json", "utf8"));
const cfg = loadConfig();
const tools = await connectMcp();
const outcomes: (EvalOutcome & { answer: string; tools: string[] })[] = [];

for (const c of cases) {
  try {
    const r = await runAgent(cfg, tools, c.question);
    const o = scoreCase(c, r);
    let verdict: JudgeResult | undefined;

    if (c.rubric) {
      verdict = await judge(cfg, c, r);
      if (!verdict.pass) {
        o.pass = false;
        o.reasons.push(`评委：${verdict.reason}（${verdict.score}/5）`);
      }
    }
    outcomes.push({ ...o, answer: r.answer, tools: r.toolCalls.map((t) => t.name) });
    const judgeNote = verdict ? `  [评委 ${verdict.score}/5：${verdict.reason}]` : "";
    console.log(`${o.pass ? "✅" : "❌"} ${c.id}${o.pass ? "" : "  → " + o.reasons.join("；")}${judgeNote}`);
  } catch (e) {
    outcomes.push({ id: c.id, pass: false, reasons: [`运行出错：${e}`], answer: "", tools: [] });
    console.log(`💥 ${c.id}  → ${e}`);
  }
}
await tools.close();

const passed = outcomes.filter((o) => o.pass).length;
console.log(`\n[${tag}] 通过 ${passed}/${cases.length}（${Math.round((passed / cases.length) * 100)}%）`);

await mkdir("results", { recursive: true });
const file = `results/${new Date().toISOString().replace(/[:.]/g, "-")}-${tag}.json`;
await writeFile(file, JSON.stringify({ tag, model: cfg.model, passed, total: cases.length, outcomes }, null, 2));
console.log(`详细结果已保存到 ${file}`);
