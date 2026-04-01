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
