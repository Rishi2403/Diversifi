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


### Example -

# Stock News Web Scraping API
<img width="917" height="811" alt="image" src="https://github.com/user-attachments/assets/2b0fddfe-6270-42d9-bd2f-69377d62c812" />

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
## Supported Stock Symbols
- Any stocks: ETERNAL,WIPRO,AAPL, MSFT, GOOGL, TSLA, etc.
- The system will attempt to scrape news for any valid stock symbol


## Testing
Run the test script to verify scraping functionality:
```bash
python test_scraping.py
```

## How I Used AI in This Project

During the development of this API, I leveraged GPT as a productivity and problem-solving assistant to speed up implementation and ensure high-quality results. Specifically, GPT helped me with:

- **Research & Planning** – Quickly gathering information about different financial news sources (Finviz, Seeking Alpha, MarketWatch) and identifying optimal scraping strategies.  
- **Code Assistance** – Generating initial boilerplate code for FastAPI endpoints, scraping functions, and sentiment analysis logic, which I then customized for our needs.  
- **Debugging Support** – Explaining error messages, suggesting fixes for scraping issues, and optimizing API performance.  
- **Documentation Writing** – Helping draft clear, structured documentation for the API so it’s easy to understand for both developers and non-technical stakeholders.  
- **Best Practices** – Providing guidance on rate limiting, fallback handling, and database storage to make the API more robust.  

By using AI tools in these ways, I was able to **deliver with cleaner code and better documentation**, while still maintaining full ownership of the development process.
