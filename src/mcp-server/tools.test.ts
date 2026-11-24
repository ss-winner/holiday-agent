// 测试检查的是"规则"而不是"写死的结果"，所以往 products.ts 里加数据也不会让测试失败。
import { test } from "node:test";
import assert from "node:assert/strict";
import { products } from "../data/products.js";
import { listProducts, getProductDetail, lowStockAlert, validateDraft,getProductPriceCalendar } from "./tools.js";

// 从数据里取一个目的地来测，不写死"三亚"
const dest = products[0].destination;

test("列出商品：只返回该目的地的商品，按最低价从低到高排序", () => {
  const r = listProducts({ destination: dest });
  assert.ok(r.length > 0);
  for (const x of r) {
    const p = getProductDetail(x.id)!;
    assert.ok(p.destination.includes(dest) || p.title.includes(dest));
  }
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].lowestPrice <= r[i].lowestPrice);
});

test("列出商品：最低价、总库存、售罄班期与原始数据一致", () => {
  for (const x of listProducts()) {
    const ds = getProductDetail(x.id)!.departures;
    assert.equal(x.lowestPrice, Math.min(...ds.map((d) => d.price)));
    assert.equal(x.totalStock, ds.reduce((s, d) => s + d.stock, 0));
    assert.deepEqual(x.soldOutDates, ds.filter((d) => d.stock === 0).map((d) => d.date));
  }
});

test("按最高价筛选：不超过的都在，超过的都不在", () => {
  const all = listProducts();
  const max = all[Math.floor(all.length / 2)].lowestPrice; // 取中间的价格做阈值
  const ids = new Set(listProducts({ maxPrice: max }).map((x) => x.id));
  for (const x of all) assert.equal(ids.has(x.id), x.lowestPrice <= max);
});

test("库存预警：结果都符合条件、按日期排序、一个不漏", () => {
  const q = { threshold: 5, startDate: "2026-11-01", endDate: "2026-11-30" };
  const r = lowStockAlert(q);
  for (const x of r) {
    assert.ok(x.stock <= q.threshold);
    assert.ok(x.date >= q.startDate && x.date <= q.endDate);
    assert.equal(x.status, x.stock === 0 ? "已售罄" : "库存紧张");
  }
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].date <= r[i].date);
  const expected = products
    .flatMap((p) => p.departures)
    .filter((d) => d.stock <= q.threshold && d.date >= q.startDate && d.date <= q.endDate).length;
  assert.equal(r.length, expected);
});

test("查看详情：存在的能查到，不存在的返回 undefined", () => {
  assert.equal(getProductDetail(products[0].id)?.id, products[0].id);
  assert.equal(getProductDetail("NOPE"), undefined);
});

test("录入校验：缺字段、价格为 0、过去的日期都会报错", () => {
  const r = validateDraft(
    { title: "杭州1日游", days: 1, departures: [{ date: "2026-01-01", price: 0, stock: 5 }] },
    "2026-11-03",
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("目的地")));
  assert.ok(r.errors.some((e) => e.includes("早于今天")));
  assert.ok(r.errors.some((e) => e.includes("价格")));
});

test("录入校验：测试字样、天数晚数不符、标题缺目的地会给出提醒", () => {
  const r = validateDraft(
    {
      title: "上海迪士尼1日1晚跟团游 qwewqewqe",
      type: "跟团游",
      destination: "杭州",
      days: 1,
      nights: 1,
      includes: ["门票"],
      departures: [{ date: "2026-12-01", price: 899, stock: 10 }],
    },
    "2026-11-03",
  );
  assert.equal(r.ok, true); // 只有提醒，没有必须修改的错误
  assert.equal(r.warnings.length, 3);
});

test("P1008 普吉岛：2026-12-26库存只剩4个，会出现在库存预警里", () => {
  const r = lowStockAlert({ startDate: "2026-12-01", endDate: "2026-12-31" });
  assert.ok(r.some((x) => x.id === "P1008" && x.date === "2026-12-26"));
});
test("录入校验：P1009 班期格式是否正确", () => {
  const r = validateDraft(products.find((x) => x.id === "P1009")!);
  assert.ok(!r.errors.some((e) => e.includes("日期格式")));
});
test("录入校验：邮轮类型的产品目的地为空", () => {
  products.map((x) => {
    if (x.type === "邮轮") {
    assert.ok(x.destination == "");
    }
  })
});
test("录入校验：私家团类型费用包含司机", () => {
  products.map((x) => {
    if (x.type === "私家团") {
    assert.ok(x.includes.includes("司机"));
    }
  })
});
test("录入校验：半自助类型费用不包含导游", () => {
  products.map((x) => {
    if (x.type === "半自助") {
    assert.ok(!x.includes.includes("导游"));
    }
  })
});

test("录入校验：查看某商品某月每个班期的价格", () => {
  const r = getProductPriceCalendar("P1009","09");
  assert.ok(r?.length > 0);
  console.log(listProducts())
})
