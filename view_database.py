#!/usr/bin/env python3
"""
Simple script to view the SQLite database contents
"""

import sqlite3
import json
from datetime import datetime

def view_database():
    try:
        # Connect to the database
        conn = sqlite3.connect('news_sentiment.db')
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Available tables:", tables)
        
        if not tables:
            print("No tables found. Run the API first to create data.")
            return
        
        # Get all records from news_records table
        cursor.execute("SELECT * FROM news_records ORDER BY timestamp DESC;")
        records = cursor.fetchall()
        
        print(f"\nFound {len(records)} records in database:")
        print("=" * 80)
        
        for record in records:
            record_id, symbol, timestamp, headlines_json = record
            
            print(f"\nRecord ID: {record_id}")
            print(f"Symbol: {symbol}")
            print(f"Timestamp: {timestamp}")
            print(f"Headlines:")
            
            try:
                # Parse the JSON headlines
                headlines = json.loads(headlines_json)
                for i, headline in enumerate(headlines, 1):
                    sentiment = headline.get('sentiment', 'N/A')
                    print(f"   {i}. [{sentiment.upper()}] {headline.get('title', 'N/A')}")
            except json.JSONDecodeError:
                print(f"   Raw data: {headlines_json}")
            
            print("-" * 60)
        
        # Show table schema
        print(f"\nTable Schema:")
        cursor.execute("PRAGMA table_info(news_records);")
        schema = cursor.fetchall()
        for column in schema:
            print(f"   {column[1]} ({column[2]})")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("DATABASE VIEWER - Stock News Database")
    print("=" * 40)
    view_database()