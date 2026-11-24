import "dotenv/config";
import type { LlmConfig } from "./agent/llm.js";

export function loadConfig(): LlmConfig {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey || apiKey === "你的API密钥") {
    throw new Error("请先复制 .env.example 为 .env，并填写 MINIMAX_API_KEY");
  }
  return {
    apiKey,
    baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1",
    model: process.env.MINIMAX_MODEL ?? "MiniMax-M3.1-Flash",
  };
}
