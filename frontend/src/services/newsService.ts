export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";

const generateMockData = (topic: string): NewsArticle[] => {
  return [
    {
      title: `${topic} specific supply chain disruptions expected this quarter`,
      description: `Analysis shows upcoming shifts in the ${topic} market as geopolitical tensions continue to affect global trade routes and economic stability.`,
      url: "#",
      image: "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&q=80&w=400&h=250",
      publishedAt: new Date().toISOString(),
      source: { name: "Global Trade Daily", url: "#" },
    },
    {
      title: `Emerging tech sectors in ${topic} see unprecedented growth`,
      description: `Investment is surging in defense and energy sectors related to ${topic}, driving new market dynamics.`,
      url: "#",
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=400&h=250",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      source: { name: "Market Insights News", url: "#" },
    },
    {
      title: `Regional alliances shift focus in ${topic}`,
      description: `New trade agreements are expected to be signed next week which could alter the balance of power in the global tech trade.`,
      url: "#",
      image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=400&h=250",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      source: { name: "Geopolitics Now", url: "#" },
    },
  ];
};

const globalMockData: NewsArticle[] = [
  {
    title: "Global semiconductor shortage eases, but risks remain",
    description: "While production has increased, ongoing tensions threaten to disrupt key supply chains in Asia-Pacific and North America.",
    url: "#",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 1000000).toISOString(),
    source: { name: "Tech Economy News", url: "#" },
  },
  {
    title: "Energy sector volatility continues amid Eastern European conflict",
    description: "Oil and gas prices see sharp fluctuations as traders react to the latest military and diplomatic developments in the region.",
    url: "#",
    image: "https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 4000000).toISOString(),
    source: { name: "Energy Market Watch", url: "#" },
  },
  {
    title: "Defense spending surges across NATO member states",
    description: "New budgetary commitments suggest a long-term shift toward rearmament and modernization of military capabilities globally.",
    url: "#",
    image: "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 8000000).toISOString(),
    source: { name: "Global Intelligence", url: "#" },
  },
];

export async function fetchCountryGeopolitics(countryCode: string, countryName: string): Promise<NewsArticle[]> {
  if (!GNEWS_API_KEY || GNEWS_API_KEY === "YOUR_GNEWS_API_KEY_HERE") {
    console.log("Using mock data for", countryName);
    return generateMockData(countryName);
  }

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=(geopolitics OR economy OR war OR trade) AND ${encodeURIComponent(countryName)}&lang=en&max=5&apikey=${GNEWS_API_KEY}`
    );
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.warn("Failed to fetch news from GNews, returning mock data", error);
    return generateMockData(countryName);
  }
}

const marketMockData: NewsArticle[] = [
  {
    title: "Federal Reserve signals cautious approach to rate cuts as inflation data mixed",
    description: "Fed officials indicate they need more confidence that inflation is on a sustained path to 2% before beginning to ease monetary policy.",
    url: "#",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 900000).toISOString(),
    source: { name: "Reuters Markets", url: "#" },
  },
  {
    title: "Asian markets rally as China stimulus measures boost investor confidence",
    description: "Shanghai and Hong Kong indices climbed on renewed optimism after Beijing announced additional fiscal support for the property sector and consumer spending.",
    url: "#",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    source: { name: "Bloomberg Asia", url: "#" },
  },
  {
    title: "Gold hits record highs as dollar weakens and central bank buying continues",
    description: "Spot gold surged past key resistance levels as global central banks diversify reserves away from US dollar-denominated assets.",
    url: "#",
    image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    source: { name: "Commodity Watch", url: "#" },
  },
  {
    title: "Nifty 50 scales fresh all-time high on FII inflows and strong earnings season",
    description: "Indian equities outperformed regional peers with broad-based buying in banking, IT, and consumer discretionary stocks.",
    url: "#",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    source: { name: "Economic Times Markets", url: "#" },
  },
  {
    title: "Oil prices steady as OPEC+ extends production cuts through end of year",
    description: "Crude benchmarks held near recent highs after the cartel reaffirmed output discipline despite pressure from non-member producers.",
    url: "#",
    image: "https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    source: { name: "Energy Market Watch", url: "#" },
  },
  {
    title: "Bitcoin consolidates above key support as ETF inflows remain strong",
    description: "Institutional demand through spot Bitcoin ETFs continues to provide a floor for prices even as retail sentiment turns cautious.",
    url: "#",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400&h=250",
    publishedAt: new Date(Date.now() - 18000000).toISOString(),
    source: { name: "CoinDesk", url: "#" },
  },
];

export async function fetchMarketNews(): Promise<NewsArticle[]> {
  if (!GNEWS_API_KEY || GNEWS_API_KEY === "YOUR_GNEWS_API_KEY_HERE") {
    return marketMockData;
  }
  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=stock+market+OR+economy+OR+Fed+OR+inflation+OR+GDP+OR+earnings&lang=en&max=6&apikey=${GNEWS_API_KEY}`
    );
    if (!response.ok) throw new Error(`GNews returned ${response.status}`);
    const data = await response.json();
    return data.articles?.length ? data.articles : marketMockData;
  } catch {
    return marketMockData;
  }
}

export async function fetchGlobalBreakingNews(): Promise<NewsArticle[]> {
  if (!GNEWS_API_KEY || GNEWS_API_KEY === "YOUR_GNEWS_API_KEY_HERE") {
    console.log("Using global mock data");
    return globalMockData;
  }

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=geopolitics OR "global trade" OR war OR military OR defense&lang=en&max=5&apikey=${GNEWS_API_KEY}`
    );
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.warn("Failed to fetch global news from GNews, returning mock data", error);
    return globalMockData;
  }
}
