// 业务逻辑：纯函数，不依赖 MCP，方便单独测试。
// MCP 服务器（index.ts）只负责把这些函数"包装"成工具暴露给大模型。
// 使用者是供应商：查看自己的商品、关注库存、录入新商品前做校验。

import { fi } from "zod/v4/locales";
import { Departure, products, type Product, type ProductType } from "../data/products.js";

const today = () => new Date().toISOString().slice(0, 10);

export interface ListParams {
  destination?: string;
  type?: ProductType;
  maxPrice?: number; // 只看最低价不超过该值的商品（元/人）
}

export interface ProductSummary {
  id: string;
  title: string;
  type: ProductType;
  days: number;
  departureCount: number; // 班期数量
  lowestPrice: number; // 所有班期中的最低价
  totalStock: number; // 所有班期剩余库存之和
  soldOutDates: string[]; // 已售罄的班期
}

/** 列出供应商的商品概况（含已售罄班期，供应商需要看到全貌），按最低价排序 */
export function listProducts(p: ListParams = {}): ProductSummary[] {
  return products
    .filter((x) => !p.destination || x.destination.includes(p.destination) || x.title.includes(p.destination))
    .filter((x) => !p.type || x.type === p.type)
    .map((x) => ({
      id: x.id,
      title: x.title,
      type: x.type,
      days: x.days,
      departureCount: x.departures.length,
      lowestPrice: Math.min(...x.departures.map((d) => d.price)),
      totalStock: x.departures.reduce((s, d) => s + d.stock, 0),
      soldOutDates: x.departures.filter((d) => d.stock === 0).map((d) => d.date),
      expiredDates: x.departures.filter((d) => d.date < today()).map((d) => d.date),
    }))
    .filter((x) => p.maxPrice === undefined || x.lowestPrice <= p.maxPrice)
    .sort((a, b) => a.lowestPrice - b.lowestPrice);
}

/** 查看单个商品的完整信息（含全部班期与库存） */
export function getProductDetail(id: string): Product | undefined {
  return products.find((x) => x.id === id);
}

export interface StockAlert {
  id: string;
  title: string;
  date: string;
  stock: number;
  status: "已售罄" | "库存紧张";
}

/** 库存预警：找出指定日期范围内库存 ≤ threshold 的班期，按出发日期排序 */
export function lowStockAlert(p: { threshold?: number; startDate?: string; endDate?: string } = {}): StockAlert[] {
  const threshold = p.threshold ?? 5;
  return products
    .flatMap((x) =>
      x.departures
        .filter((d) => d.stock <= threshold)
        .filter((d) => (!p.startDate || d.date >= p.startDate) && (!p.endDate || d.date <= p.endDate))
        .map((d) => ({
          id: x.id,
          title: x.title,
          date: d.date,
          stock: d.stock,
          status: d.stock === 0 ? ("已售罄" as const) : ("库存紧张" as const),
        })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ProductDraft {
  title: string;
  type: ProductType;
  destination: string;
  days: number;
  nights: number;
  includes: string[];
  departures: { date: string; price: number; stock: number }[];
}

export interface ValidationResult {
  ok: boolean; // 没有"必须修改"的问题即可提交
  errors: string[]; // 必须修改
  warnings: string[]; // 建议核实
}

/** 校验商品录入草稿（不真正入库）。规则来自供应商录入的真实常见问题 */
export function validateDraft(d: Partial<ProductDraft>, now: string = today()): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!d.title) errors.push("缺少商品标题");
  if (!d.type) errors.push("缺少商品类型（跟团游/自由行/半自助/邮轮/私家团）");
  if (!d.destination) errors.push("缺少目的地");
  if (!d.days || d.days <= 0) errors.push("行程天数必须大于 0");
  if (!d.includes?.length) errors.push("缺少费用包含说明");
  if (!d.departures?.length) errors.push("至少需要一个班期");

  const seen = new Set<string>();
  d.departures?.forEach((x, i) => {
    const n = `第${i + 1}个班期`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) errors.push(`${n}日期格式应为 YYYY-MM-DD`);
    else if (x.date < now) errors.push(`${n}（${x.date}）已早于今天`);
    if (seen.has(x.date)) errors.push(`${n}（${x.date}）与其他班期日期重复`);
    seen.add(x.date);
    if (!(x.price > 0)) errors.push(`${n}价格必须大于 0`);
    if (x.stock < 0) errors.push(`${n}库存不能为负数`);
  });

  // 以下为"建议核实"：不一定错，但录入中经常出问题
  if (d.title && /测试|test|验证|(.)\1{3,}|qwe|asd/i.test(d.title))
    warnings.push("标题中疑似包含测试字样或无意义字符，上线前请确认");
  if (d.days && d.nights !== undefined && d.nights !== d.days - 1)
    warnings.push(`行程 ${d.days} 天却有 ${d.nights} 晚住宿，通常晚数为天数减 1，请确认`);
  if (d.title && d.destination && !d.title.includes(d.destination))
    warnings.push(`标题中没有出现目的地「${d.destination}」，请确认目的地是否填写正确`);

  // TODO(第9天)：加上你在供应商录入中见过的更多规则，比如同目的地价格异常偏低提醒
  return { ok: errors.length === 0, errors, warnings };
}

// price_calendar（查某商品某月每个班期的价格)
export function getProductPriceCalendar(id: string,month:string): Departure[] | undefined {
  const r =  products.find((x) => x.id === id);
  if (!r) return undefined;
  const filteredDepartures:Departure[] = r.departures.filter((d) => d.date.includes(month));
  return filteredDepartures.length > 0 ? filteredDepartures : undefined;
}