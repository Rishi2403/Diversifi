# Stock News Sentiment API

A FastAPI-based service that fetches news for Indian stock symbols, analyzes sentiment, and stores results in a local database.

## Features

- **POST /news-sentiment**: Accepts stock symbol, fetches recent news, analyzes sentiment
- **Sentiment Analysis**: Uses TextBlob + financial keyword analysis 
- **Database Storage**: Stores results in local SQLite database
- **Indian Stock Focus**: Optimized for Indian stock symbols (TCS, INFY, RELIANCE, HDFC, etc.)

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Server
```bash
python main.py
```
Server will start on `http://localhost:8000`

### 3. Test the API

#### Using curl:
```bash
curl -X POST "http://localhost:8000/news-sentiment" \
     -H "Content-Type: application/json" \
     -d '{"symbol": "TCS"}'
```

#### Using the test script:
```bash
python test_api.py
```

## API Endpoints

### POST /news-sentiment
Fetches news and analyzes sentiment for a stock symbol.

**Request:**
```json
{
  "symbol": "TCS"
}
```

**Response:**
```json
{
  "symbol": "TCS",
  "timestamp": "2025-07-29T18:00:00Z",
  "headlines": [
    {
      "title": "TCS reports strong Q1 growth with 15% revenue increase",
      "sentiment": "positive"
    },
    {
      "title": "IT sector faces macro uncertainty amid global slowdown",
      "sentiment": "negative"
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-29T18:00:00Z"
}
```

## Supported Stock Symbols

The API includes mock data for popular Indian stocks:
- **TCS** - Tata Consultancy Services
- **INFY** - Infosys
- **RELIANCE** - Reliance Industries
- **HDFC** - HDFC Bank

For other symbols, generic news templates are used.

## Database

- Uses SQLite database (`news_sentiment.db`)
- Stores timestamp, symbol, and headlines with sentiment
- Database created automatically on first run

## Sentiment Analysis

Combines two approaches:
1. **TextBlob**: General sentiment polarity analysis
2. **Financial Keywords**: Domain-specific positive/negative word detection

Returns: `positive`, `negative`, or `neutral`

## Production Notes

- Currently uses mock news data for demo purposes
- To use real news APIs, update `news_service.py` with API keys
- Supported news APIs: NewsAPI, Alpha Vantage, MarketAux
- Add authentication and rate limiting for production use

## Files Structure

```
├── main.py              # FastAPI application and endpoints
├── database.py          # SQLAlchemy models and database setup
├── news_service.py      # News fetching service (mock data)
├── sentiment_service.py # Sentiment analysis using TextBlob + keywords
├── test_api.py          # API testing script
├── requirements.txt     # Python dependencies
└── README_API.md        # This file
```