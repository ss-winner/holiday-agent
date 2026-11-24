// 模拟的度假商品数据。真实项目里这里会换成数据库或携程类系统的 API。
// TODO(第2天)：按你熟悉的业务再补 5~10 个商品，覆盖更多目的地和类型。

export type ProductType = "跟团游" | "自由行" | "半自助"|"私家团"|"邮轮";

export interface Departure {
  date: string; // YYYY-MM-DD
  price: number; // 成人价，元/人
  stock: number; // 剩余库存
}

export interface Product {
  id: string;
  title: string;
  type: ProductType;
  destination: string;
  departureCities: string[];   // 改为数组
  days: number;
  nights: number;              // 新增
  tags: { name: string; category: string }[];  // 改为带分类
  includes: string[];
  excludes: string[];
  departures: Departure[];
}

export const products: Product[] = [
  {
    id: "P1001",
    title: "三亚5天4晚自由行·亚龙湾海景酒店+往返机票",
    type: "自由行",
    destination: "三亚",
    departureCities: ["上海"],
    days: 5,
    nights: 4,
      tags: [
    { name: "老年团", category: "特色服务" },
    { name: "海岛", category: "产品特色" },
  ],
    includes: ["往返经济舱机票", "4晚亚龙湾海景酒店", "每日双早"],
    excludes: ["当地交通", "景点门票"],
    departures: [
      { date: "2026-12-14", price: 3299, stock: 12 },
      { date: "2026-12-21", price: 3499, stock: 3 },
      { date: "2026-12-05", price: 3899, stock: 20 },
    ],
  },
  {
    id: "P1002",
    title: "三亚6天5晚跟团游·蜈支洲岛+南山+天涯海角",
    type: "跟团游",
    destination: "三亚",
    departureCities: ["上海"],
    days: 6,
    nights: 5,
    tags: [
      { name: "海岛", category: "产品特色" },
      { name: "纯玩无购物", category: "产品特色" },
      { name: "中老年", category: "目标客户" },
    ],
    includes: ["往返机票", "5晚酒店", "全程中文导游", "景点首道门票", "5早4正"],
    excludes: ["个人消费", "单房差"],
    departures: [
      { date: "2026-12-16", price: 4580, stock: 8 },
      { date: "2026-12-30", price: 4380, stock: 0 },
      { date: "2026-12-14", price: 4980, stock: 15 },
    ],
  },
  {
    id: "P1003",
    title: "云南大理丽江6天5晚跟团游·洱海骑行+玉龙雪山",
    type: "跟团游",
    destination: "云南",
    departureCities: ["上海"],
    days: 6,
    nights: 5,
    tags: [
      { name: "雪山", category: "产品特色" },
      { name: "古城", category: "产品特色" },
      { name: "摄影", category: "产品特色" },
    ],
    includes: ["往返机票", "5晚酒店", "导游服务", "玉龙雪山大索道"],
    excludes: ["个人消费", "部分自费项目"],
    departures: [
      { date: "2026-12-10", price: 3980, stock: 6 },
      { date: "2026-12-24", price: 3680, stock: 10 },
    ],
  },
  {
    id: "P1004",
    title: "日本东京大阪7天6晚半自助·含签证+新干线",
    type: "半自助",
    destination: "日本",
    departureCities: ["上海"],
    days: 7,
    nights: 6,  
    tags: [
      { name: "出境", category: "产品特色" },
      { name: "购物", category: "产品特色" },
      { name: "动漫", category: "产品特色" },
    ],
    includes: ["往返机票", "6晚酒店", "日本签证", "东京至大阪新干线单程票"],
    excludes: ["午晚餐", "当地交通卡"],
    departures: [
      { date: "2026-12-20", price: 6999, stock: 5 },
      { date: "2026-12-18", price: 8299, stock: 9 },
    ],
  },
  {
    id: "P1005",
    title: "杭州千岛湖3天2晚自由行·湖景酒店+游船",
    type: "自由行",
    destination: "杭州",
    departureCities: ["上海"],
    days: 3,
    nights: 2,
    tags: [
      { name: "周边游", category: "产品特色" },
      { name: "亲子", category: "目标客户" },
      { name: "湖景", category: "产品特色" },
    ],
    includes: ["2晚湖景酒店", "千岛湖游船票", "每日双早"],
    excludes: ["往返交通"],
    departures: [
      { date: "2026-12-07", price: 1299, stock: 30 },
      { date: "2026-12-14", price: 1399, stock: 18 },
    ],
  },
  {
    id: "P1006",
    title: "泰国普吉岛6天4晚自由行·皮皮岛出海",
    type: "自由行",
    destination: "泰国",
    departureCities: ["上海"],
    days: 6,
    nights: 4,
    tags: [
      { name: "出境", category: "产品特色" },
      { name: "海岛", category: "产品特色" },
      { name: "免签", category: "产品特色" },
    ],
    includes: ["往返机票", "4晚酒店", "皮皮岛一日游"],
    excludes: ["签证费（免签）", "个人消费"],
    departures: [
      { date: "2026-12-12", price: 4299, stock: 7 },
      { date: "2026-12-10", price: 4899, stock: 12 },
    ],
  },
  {
  id: "P1007",
  title: "上海迪士尼度假区2天1晚跟团游·含门票+酒店",
  type: "跟团游",
  destination: "上海",
  departureCities: ["杭州", "南京"],
  days: 2,
  nights: 1,
  tags: [
    { name: "成团保障", category: "产品服务" },
    { name: "精致小团", category: "产品服务" },
    { name: "无购物", category: "购物特色" },
    { name: "提前2天免费退", category: "产品服务" },
  ],
  includes: ["迪士尼一日门票", "1晚酒店", "往返大巴"],
  excludes: ["园内餐饮"],
  departures: [
    { date: "2026-12-21", price: 1599, stock: 10 },
    { date: "2026-12-26", price: 1899, stock: 4 },
  ],
},
  {
  id: "P1008",
  title: "普吉岛五天四晚·含机票+酒店",
  type: "跟团游",
  destination: "普吉岛",
  departureCities: ["上海", "南京"],
  days: 5,
  nights: 4,
  tags: [
    { name: "成团保障", category: "产品服务" },
    { name: "精致小团", category: "产品服务" },
    { name: "无购物", category: "购物特色" },
    { name: "提前2天免费退", category: "产品服务" },
  ],
  includes: ["往返机票", "4晚酒店", "往返大巴","导游"],
  excludes: ["餐饮"],
  departures: [
    { date: "2026-12-21", price: 5599, stock: 10 },
    { date: "2026-12-26", price: 5899, stock: 4 },
  ],
},
  {
  id: "P1009",
  title: "昆大丽7天6晚·含机票+酒店",
  type: "自由行",
  destination: "昆明",
  departureCities: ["上海"],
  days: 7,
  nights: 6,
  tags: [
    { name: "成团保障", category: "产品服务" },
    { name: "精致小团", category: "产品服务" },
    { name: "无购物", category: "购物特色" },
    { name: "提前2天免费退", category: "产品服务" },
  ],
  includes: ["往返机票", "6晚酒店"],
  excludes: ["导游","餐饮"],
  departures: [
    { date: "2026-10-01", price: 7599, stock: 0 },
    { date: "2026-09-15", price: 7899, stock: 20 },
    { date: "2026-09-25", price: 7800, stock: 20 },
    { date: "2026-09-05", price: 7811, stock: 20 },
  ],
},
  {
  id: "P1010",
  title: "迪士尼邮轮五天四晚-釜山",
  type: "邮轮",
  destination: "",
  departureCities: ["上海"],
  days: 5,
  nights: 4,
  tags: [
    { name: "邮轮表演", category: "特色服务" },
  ],
  includes: ["餐食", "住宿"],
  excludes: [],
  departures: [
    { date: "2026-10-11", price: 3599, stock: 13 },
    { date: "2026-10-15", price: 3899, stock: 22 },
  ],
},
  {
  id: "P1011",
  title: "三亚五天四晚豪华游",
  type: "私家团",
  destination: "三亚",
  departureCities: ["北京"],
  days: 5,
  nights: 4,
  tags: [
    { name: "私家车", category: "特色服务" },
    { name: "英语导游", category: "特色服务" },

  ],
  includes: ["餐食", "住宿","导游","司机","商务车"],
  excludes: [],
  departures: [
    { date: "2026-12-11", price: 5599, stock: 3 },
    { date: "2026-12-15", price: 5899, stock: 22 },
  ],
},
  {
  id: "P1012",
  title: "上海三天两晚亲子游-目的地成团",
  type: "半自助",
  destination: "上海",
  departureCities: [],
  days: 3,
  nights: 2,
  tags: [
    { name: "亲子", category: "目标客户" },

  ],
  includes: ["住宿","门票",],
  excludes: ["餐食","导游"],
  departures: [
    { date: "2026-09-11", price: 1599, stock: 0 },
    { date: "2026-09-15", price: 1899, stock: 18 },
  ],
},
];

