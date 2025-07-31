from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn
import json
from sqlalchemy.orm import Session

from database import get_db, create_tables, NewsRecord
from news_service import NewsService
from sentiment_service import SentimentAnalyzer

app = FastAPI(title="Stock News Sentiment API", version="1.0.0")

# Initialize services
news_service = NewsService()
sentiment_analyzer = SentimentAnalyzer()

# Create database tables on startup
create_tables()

class StockRequest(BaseModel):
    symbol: str

class HeadlineResponse(BaseModel):
    title: str
    sentiment: str

class NewsResponse(BaseModel):
    symbol: str
    timestamp: str
    headlines: List[HeadlineResponse]

@app.get("/")
async def root():
    return {"message": "Stock News Sentiment API"}

@app.post("/news-sentiment", response_model=NewsResponse)
async def get_news_sentiment(request: StockRequest, db: Session = Depends(get_db)):
    try:
        # Validate symbol
        if not request.symbol or len(request.symbol.strip()) == 0:
            raise HTTPException(status_code=400, detail="Symbol cannot be empty")
        
        symbol = request.symbol.strip().upper()
        
        # Fetch news headlines
        news_headlines = news_service.fetch_stock_news(symbol)
        
        if not news_headlines:
            raise HTTPException(status_code=404, detail=f"No news found for symbol: {symbol}")
        
        # Analyze sentiment for each headline
        analyzed_headlines = sentiment_analyzer.analyze_headlines(news_headlines)
        
        # Convert to HeadlineResponse objects
        headline_responses = [
            HeadlineResponse(title=h['title'], sentiment=h['sentiment'])
            for h in analyzed_headlines
        ]
        
        # Create response
        current_time = datetime.utcnow()
        response = NewsResponse(
            symbol=symbol,
            timestamp=current_time.isoformat() + "Z",
            headlines=headline_responses
        )
        
        # Store in database
        news_record = NewsRecord(
            symbol=symbol,
            timestamp=current_time,
            headlines_json=json.dumps([headline.dict() for headline in headline_responses])
        )
        db.add(news_record)
        db.commit()
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}

@app.get("/database")
async def view_database(db: Session = Depends(get_db)):
    """View all stored news records"""
    try:
        records = db.query(NewsRecord).order_by(NewsRecord.timestamp.desc()).all()
        
        result = []
        for record in records:
            headlines_data = json.loads(record.headlines_json) if record.headlines_json else []
            result.append({
                "id": record.id,
                "symbol": record.symbol,
                "timestamp": record.timestamp.isoformat() + "Z",
                "headlines": headlines_data
            })
        
        return {
            "total_records": len(result),
            "records": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading database: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)