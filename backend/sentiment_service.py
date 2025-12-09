from textblob import TextBlob
from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    def __init__(self):
        # Keywords that typically indicate positive sentiment in financial news
        self.positive_keywords = [
            'growth', 'profit', 'strong', 'beat', 'exceeds', 'record', 'robust', 
            'expansion', 'gains', 'rise', 'increase', 'improvement', 'success',
            'breakthrough', 'acquisition', 'deal', 'partnership', 'launch'
        ]
        
        # Keywords that typically indicate negative sentiment in financial news
        self.negative_keywords = [
            'loss', 'decline', 'fall', 'drop', 'weak', 'concerns', 'uncertainty',
            'pressure', 'headwinds', 'challenges', 'volatility', 'slowdown',
            'recession', 'crisis', 'bankruptcy', 'lawsuit', 'fraud'
        ]
    
    def analyze_sentiment(self, text: str) -> str:
        """
        Analyze sentiment of a given text using TextBlob and keyword analysis
        Returns: 'positive', 'negative', or 'neutral'
        """
        try:
            # Clean the text
            cleaned_text = self._clean_text(text)
            
            # Use TextBlob for basic sentiment analysis
            blob = TextBlob(cleaned_text)
            polarity = blob.sentiment.polarity
            
            # Enhance with financial keyword analysis
            keyword_sentiment = self._analyze_keywords(cleaned_text.lower())
            
            # Combine both approaches
            final_sentiment = self._combine_sentiments(polarity, keyword_sentiment)
            
            return final_sentiment
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return "neutral"
    
    def _clean_text(self, text: str) -> str:
        """Clean and preprocess text for sentiment analysis"""
        # Remove extra whitespace and special characters
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s]', ' ', text)
        return text.strip()
    
    def _analyze_keywords(self, text: str) -> float:
        """Analyze sentiment based on financial keywords"""
        positive_count = sum(1 for keyword in self.positive_keywords if keyword in text)
        negative_count = sum(1 for keyword in self.negative_keywords if keyword in text)
        
        if positive_count == 0 and negative_count == 0:
            return 0.0
        
        # Calculate keyword-based sentiment score
        total_keywords = positive_count + negative_count
        keyword_score = (positive_count - negative_count) / total_keywords
        
        return keyword_score
    
    def _combine_sentiments(self, textblob_polarity: float, keyword_sentiment: float) -> str:
        """Combine TextBlob polarity and keyword sentiment"""
        # Weight both approaches equally
        combined_score = (textblob_polarity + keyword_sentiment) / 2
        
        # Set thresholds for classification
        if combined_score > 0.1:
            return "positive"
        elif combined_score < -0.1:
            return "negative"
        else:
            return "neutral"
    
    def analyze_headlines(self, headlines: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Analyze sentiment for a list of headlines
        """
        analyzed_headlines = []
        
        for headline_data in headlines:
            title = headline_data.get('title', '')
            sentiment = self.analyze_sentiment(title)
            
            analyzed_headlines.append({
                'title': title,
                'sentiment': sentiment
            })
        
        return analyzed_headlines