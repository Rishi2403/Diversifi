from fastmcp import FastMCP
from news_service import NewsService
from typing import List, Dict

news_service = NewsService()

mcp = FastMCP("Stock-News-Tool")

@mcp.tool()
def fetch_news(symbol: str, limit: int = 3) -> List[Dict[str, str]]:
    return news_service.fetch_stock_news(symbol, limit)

if __name__ == "__main__":
    mcp.run()