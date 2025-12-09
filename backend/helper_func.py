from textblob import TextBlob


def analyze_sentiment(texts: list) -> dict:
    """
    Simple sentiment analysis using TextBlob.
    """
    summary = {'positive': 0, 'neutral': 0, 'negative': 0, 'total': len(texts)}
    for t in texts:
        polarity = TextBlob(t).sentiment.polarity
        if polarity > 0.1:
            summary['positive'] += 1
        elif polarity < -0.1:
            summary['negative'] += 1
        else:
            summary['neutral'] += 1
    return summary