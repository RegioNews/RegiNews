const REGIONS = [
  { id: "RU-MOW", name: "Москва", key: "moscow" },
  { id: "RU-SPE", name: "Санкт-Петербург", key: "spb" },
  { id: "RU-LEN", name: "Ленинградская область", key: "lenobl" }
];

const VERIFIED_SOURCES = {
  moscow: [
    { name: "Москва 24 Telegram", type: "tg", mode: "telegram", url: "https://t.me/infomoscow24" }
  ],
  spb: [
    { name: "Фонтанка RSS", type: "media", mode: "rss", url: "https://www.fontanka.ru/rss-feeds/zen-news.xml" }
  ],
  lenobl: [
    { name: "47news", type: "media", mode: "html", url: "https://47news.ru/articles/" },
    { name: "47news Telegram", type: "tg", mode: "telegram", url: "https://t.me/allnews47" }
  ]
};

const PROXIES = [
  { type: 'json', make: (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}` },
  { type: 'xml', make: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` }
];