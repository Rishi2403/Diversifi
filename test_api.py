import requests
import json

def test_api():
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test root endpoint
    print("\nTesting root endpoint...")
    try:
        response = requests.get(f"{base_url}/")
        print(f"Root endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Root endpoint failed: {e}")
    
    # Test news-sentiment endpoint with different symbols
    test_symbols = ["TCS", "INFY", "RELIANCE", "HDFC", "UNKNOWN"]
    
    for symbol in test_symbols:
        print(f"\nTesting news-sentiment for {symbol}...")
        try:
            payload = {"symbol": symbol}
            response = requests.post(f"{base_url}/news-sentiment", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print(f"Success for {symbol}:")
                print(f"  Timestamp: {result['timestamp']}")
                print(f"  Headlines count: {len(result['headlines'])}")
                for i, headline in enumerate(result['headlines'], 1):
                    print(f"  {i}. {headline['title'][:60]}... - {headline['sentiment']}")
            else:
                print(f"Error for {symbol}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Request failed for {symbol}: {e}")

if __name__ == "__main__":
    print("Stock News Sentiment API Test")
    print("=" * 40)
    print("Make sure the server is running on localhost:8000")
    print("Start server with: python main.py")
    print("=" * 40)
    
    test_api()