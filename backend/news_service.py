import requests
from typing import List, Dict
import logging
from bs4 import BeautifulSoup
import time
import random
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

class NewsService:
    def __init__(self):
        self.base_urls = [
            "https://newsapi.org/v2/everything",
            "https://api.marketaux.com/v1/news/all"
        ]
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def scrape_finviz_news(self, symbol: str, limit: int = 3) -> List[Dict[str, str]]:
        """
        Scrape news headlines from Finviz for a given stock symbol.
        Finviz is more scraping-friendly than other financial sites.
        """
        try:
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(1, 2))
            
            url = f"https://finviz.com/quote.ashx?t={symbol}"
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            news_items = []
            
            # Finviz news table
            news_table = soup.find('table', class_='fullview-news-outer')
            if news_table:
                rows = news_table.find_all('tr')[:limit]
                
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        title_cell = cells[1]
                        link = title_cell.find('a')
                        if link:
                            title = link.get_text(strip=True)
                            if title and len(title) > 10:
                                news_items.append({
                                    'title': title,
                                    'source': 'Finviz'
                                })
            
            return news_items
            
        except Exception as e:
            # logger.error(f"Error scraping Finviz: {e}")
            return []

    def scrape_seeking_alpha_news(self, symbol: str, limit: int = 3) -> List[Dict[str, str]]:
        """
        Scrape news headlines from Seeking Alpha RSS feed for a given stock symbol.
        """
        try:
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(1, 2))
            
            # Use Seeking Alpha RSS feed which is more scraper-friendly
            url = f"https://seekingalpha.com/api/sa/combined/{symbol}.xml"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'xml')
                news_items = []
                
                items = soup.find_all('item')[:limit]
                for item in items:
                    title_tag = item.find('title')
                    if title_tag:
                        title = title_tag.get_text(strip=True)
                        if title:
                            news_items.append({
                                'title': title,
                                'source': 'Seeking Alpha'
                            })
                
                return news_items
            
        except Exception as e:
            # logger.error(f"Error scraping Seeking Alpha: {e}")
            return[]
        
        # Fallback to simple web search approach
        try:
            query = quote_plus(f"{symbol} stock news")
            url = f"https://www.google.com/search?q={query}&tbm=nws"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            news_items = []
            
            # Simple Google News search results
            headlines = soup.find_all('h3')[:limit]
            
            for headline in headlines:
                title = headline.get_text(strip=True)
                if title and len(title) > 15:
                    news_items.append({
                        'title': title,
                        'source': 'Web Search'
                    })
            
            return news_items
            
        except Exception as e:
            # logger.error(f"Error with web search fallback: {e}")
            return []

    def scrape_marketwatch_news(self, symbol: str, limit: int = 3) -> List[Dict[str, str]]:
        """
        Scrape news headlines from MarketWatch for a given stock symbol.
        """
        try:
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            url = f"https://www.marketwatch.com/investing/stock/{symbol.lower()}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            news_items = []
            
            # MarketWatch news articles selector
            articles = soup.find_all('a', class_='link')[:limit * 2]  # Get more to filter
            
            for article in articles:
                title = article.get_text(strip=True)
                if title and len(title) > 20:  # Filter out short non-news links
                    news_items.append({
                        'title': title,
                        'source': 'MarketWatch'
                    })
                    if len(news_items) >= limit:
                        break
            
            return news_items
            
        except Exception as e:
            logger.error(f"Error scraping MarketWatch: {e}")
            return []

    def fetch_stock_news(self, symbol: str, limit: int = 3) -> List[Dict[str, str]]:
        """
        Fetch news headlines for a given stock symbol using web scraping.
        Falls back to mock data if scraping fails.
        """
        
        # Try web scraping first
        all_news = []
        
        # Try Finviz first (most reliable for scraping)
        finviz_news = self.scrape_finviz_news(symbol, limit)
        all_news.extend(finviz_news)
        
        # If we don't have enough news, try Seeking Alpha
        if len(all_news) < limit:
            remaining = limit - len(all_news)
            sa_news = self.scrape_seeking_alpha_news(symbol, remaining)
            all_news.extend(sa_news)
        
        # If we still don't have enough news, try MarketWatch
        if len(all_news) < limit:
            remaining = limit - len(all_news)
            marketwatch_news = self.scrape_marketwatch_news(symbol, remaining)
            all_news.extend(marketwatch_news)
        
        # If we have scraped news, return it
        if all_news:
            return all_news[:limit]
        
        # Fall back to mock data if scraping fails
        logger.warning(f"Web scraping failed for {symbol}, using mock data")
        return self.fetch_mock_news(symbol, limit)

    def fetch_mock_news(self, symbol: str, limit: int = 3) -> List[Dict[str, str]]:
        """
        Fetch mock news headlines for a given stock symbol.
        This is a fallback when web scraping fails.
        """
        
        # Simulated news data for different stocks
        mock_news_data = {
            "TCS": [
                {"title": "TCS reports strong Q1 growth with 15% revenue increase", "source": "Economic Times"},
                {"title": "IT sector faces macro uncertainty amid global slowdown", "source": "Business Standard"},
                {"title": "TCS announces new AI initiatives for digital transformation", "source": "Mint"}
            ],
            "INFY": [
                {"title": "Infosys beats earnings expectations with robust performance", "source": "Economic Times"},
                {"title": "Tech stocks under pressure as inflation concerns rise", "source": "Financial Express"},
                {"title": "Infosys secures major cloud transformation deal", "source": "Business Today"}
            ],
            "RELIANCE": [
                {"title": "Reliance Industries posts record quarterly profits", "source": "Economic Times"},
                {"title": "Oil prices volatility impacts energy sector outlook", "source": "Business Standard"},
                {"title": "Reliance Jio expands 5G network across major cities", "source": "Mint"}
            ],
            "HDFC": [
                {"title": "HDFC Bank maintains strong asset quality metrics", "source": "Economic Times"},
                {"title": "Banking sector faces headwinds from rising interest rates", "source": "Financial Express"},
                {"title": "HDFC announces digital banking expansion plans", "source": "Business Today"}
            ]
        }
        
        # Get news for the symbol, or use generic tech news if symbol not found
        if symbol.upper() in mock_news_data:
            news_items = mock_news_data[symbol.upper()]
        else:
            # Generic news for unknown symbols
            news_items = [
                {"title": f"{symbol} shows mixed performance in current market conditions", "source": "Market Watch"},
                {"title": f"Analysts maintain cautious outlook on {symbol} stock", "source": "Investment Times"},
                {"title": f"{symbol} focuses on operational efficiency improvements", "source": "Business Herald"}
            ]
        
        # Return limited number of headlines
        return news_items[:limit]
    
    def fetch_news_with_api(self, symbol: str, api_key: str = None) -> List[Dict[str, str]]:
        """
        Real implementation using news APIs (commented out for demo)
        Uncomment and add your API key to use real news data
        """
        """
        if not api_key:
            logger.warning("No API key provided, using mock data")
            return self.fetch_mock_news(symbol)
        
        try:
            # Example with NewsAPI
            url = f"https://newsapi.org/v2/everything"
            params = {
                'q': f'{symbol} stock India',
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': 3,
                'apiKey': api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = data.get('articles', [])
            
            return [
                {
                    'title': article['title'],
                    'source': article['source']['name']
                }
                for article in articles[:3]
            ]
            
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return self.fetch_mock_news(symbol)
        """
        return self.fetch_mock_news(symbol)