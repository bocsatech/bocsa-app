import type { FeaturedAd, FeedItem } from "../types";

export const FEED_ITEMS: FeedItem[] = [
  {
    id: "yt1",
    kind: "youtube",
    title: "Használtautó vásárlás — mire figyelj 2026-ban",
    source: "YouTube",
    subtitle: "Add el autod · tippek",
    url: "https://www.youtube.com",
  },
  {
    id: "n1",
    kind: "news",
    title: "Új elektromos modellek a magyar piacon",
    source: "Hírek",
    subtitle: "Összefoglaló a friss kínálatról",
  },
  {
    id: "yt2",
    kind: "youtube",
    title: "BMW 3-as teszt — dízel vs hibrid",
    source: "YouTube",
    subtitle: "Összehasonlító videó",
    url: "https://www.youtube.com",
  },
  {
    id: "n2",
    kind: "news",
    title: "Átírás és eredetvizsgálat — rövid útmutató",
    source: "Útmutató",
    subtitle: "Közeli szolgáltatókhoz kapcsolódik",
  },
  {
    id: "n3",
    kind: "news",
    title: "Piaci átlagárak: Focus, Octavia, Golf",
    source: "Piac",
    subtitle: "Heti áttekintés",
  },
];

export const FEATURED_ADS: FeaturedAd[] = [
  {
    id: "a1",
    title: "BMW 320d · 2019",
    priceLabel: "8,9 M Ft",
    meta: "142 000 km · Diesel · Automat",
    badge: "Kiemelt",
  },
  {
    id: "a2",
    title: "Volkswagen Golf 1.5 TSI",
    priceLabel: "6,2 M Ft",
    meta: "68 000 km · Benzin · 2021",
    badge: "Friss",
  },
  {
    id: "a3",
    title: "Toyota Corolla Hybrid",
    priceLabel: "7,4 M Ft",
    meta: "51 000 km · Hybrid · 2022",
    badge: "Kiemelt",
  },
  {
    id: "a4",
    title: "Skoda Octavia 2.0 TDI",
    priceLabel: "5,1 M Ft",
    meta: "118 000 km · Diesel · 2018",
  },
  {
    id: "a5",
    title: "Ford Kuga ST-Line",
    priceLabel: "9,8 M Ft",
    meta: "34 000 km · Hybrid · 2023",
    badge: "Kiemelt",
  },
];
