# Stock News Web Scraping API

## Overview
This API provides real-time stock news scraping with sentiment analysis. When you provide a stock symbol, it will scrape news from multiple financial sources and analyze the sentiment of each headline.

## Features
- ✅ Web scraping from Finviz, Seeking Alpha, and MarketWatch
- ✅ Automatic sentiment analysis (positive/negative/neutral)
- ✅ Fallback to mock data if scraping fails
- ✅ Database storage of results
- ✅ RESTful API with FastAPI

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python main.py
```

### 3. Test the API
```bash
curl -X POST "http://localhost:8000/news-sentiment" \
     -H "Content-Type: application/json" \
     -d '{"symbol": "AAPL"}'
```

## API Endpoints

### POST /news-sentiment
Fetches and analyzes news for a stock symbol.

**Request:**
```json
{
  "symbol": "AAPL"
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "timestamp": "2025-01-31T12:00:00Z",
  "headlines": [
    {
      "title": "Apple reports strong quarterly earnings",
      "sentiment": "positive"
    },
    {
      "title": "Tech sector faces market uncertainty",
      "sentiment": "negative"
    }
  ]
}
```

### GET /health
Health check endpoint.

### GET /
API information.

## Supported Stock Symbols
- Major US stocks: AAPL, MSFT, GOOGL, TSLA, etc.
- The system will attempt to scrape news for any valid stock symbol

## Web Scraping Sources
1. **Finviz** - Primary source (most reliable)
2. **Seeking Alpha** - RSS feeds and web search
3. **MarketWatch** - Secondary fallback

## Testing
Run the test script to verify scraping functionality:
```bash
python test_scraping.py
```

## Notes
- The API includes rate limiting (1-3 second delays) to avoid being blocked
- Falls back to mock data if all scraping sources fail
- Sentiment analysis uses TextBlob combined with financial keyword analysis
- Results are stored in SQLite database for tracking