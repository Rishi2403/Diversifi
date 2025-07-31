#!/usr/bin/env python3
"""
Simple test script to test the web scraping functionality
"""

from news_service import NewsService
import json

def test_scraping():
    print("Testing stock news web scraping...")
    
    # Initialize the news service
    news_service = NewsService()
    
    # Test with popular stock symbols
    test_symbols = ["AAPL", "TSLA", "GOOGL", "MSFT"]
    
    for symbol in test_symbols:
        print(f"\n--- Testing {symbol} ---")
        try:
            news = news_service.fetch_stock_news(symbol, limit=3)
            print(f"Found {len(news)} news items:")
            for i, item in enumerate(news, 1):
                print(f"{i}. {item['title']} ({item['source']})")
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    test_scraping()