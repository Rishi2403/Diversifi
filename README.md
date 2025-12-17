# 📊 Diversifi

**AI-Powered Financial Intelligence Platform with Multi-Agent Architecture**

Diversifi is a comprehensive financial analysis platform that combines stock market intelligence, mutual fund research, and personalized financial advice through an advanced LangGraph-based multi-agent system.

---

## 🌟 Overview

Diversifi uses a sophisticated multi-agent workflow powered by LangGraph and Google's Gemini AI to provide intelligent financial analysis across three domains:

1. **Stock Market Analysis** - Real-time news sentiment, bull/bear analysis, and trading recommendations
2. **Mutual Fund Research** - Fund comparison, NAV tracking, and performance analysis
3. **General Finance Advisory** - Personal finance guidance using RAG (Retrieval Augmented Generation)

---

## 🏗️ Architecture

### Multi-Agent Workflow

```
User Query → Classifier → Routing Decision
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
Stock Agent  MF Agent  Finance Agent
    ↓           ↓           ↓
Sentiment   Scraper    RAG Search
Analysis    + Matcher   + Answer
    ↓           ↓           ↓
Bull/Bear   Analysis   Recommendation
Analysis
    ↓
Final Answer
```

### Agent Nodes

1. **Classifier Node** - Categorizes queries into: `stock`, `mf`, `general_finance`, or `unknown`
2. **Clarifier Node** - Requests missing information when needed
3. **Stock Agents**:
   - Symbol Extractor - Identifies stock ticker symbols
   - Sentiment Analyzer - Scrapes and analyzes news
   - Bull Handler - Bullish perspective analysis
   - Bear Handler - Bearish perspective analysis
   - Stock Handler - Balanced final recommendation
4. **Mutual Fund Agents**:
   - MF Extractor - Matches fund names using fuzzy matching
   - MF Scraper - Extracts NAV, AUM, returns from TickerTape
   - MF Handler - Provides fund comparison and recommendations
5. **General Finance Agent** - Uses vector DB for RAG-based answers

---

## 🚀 Features

### Core Capabilities

- **🤖 Multi-Agent Intelligence** - LangGraph orchestrated workflow with specialized agents
- **📰 Real-Time News Scraping** - Finviz, Seeking Alpha, MarketWatch integration
- **💹 Sentiment Analysis** - TextBlob + financial keyword detection
- **📈 Stock Analysis** - Bull/bear perspectives with balanced recommendations
- **🏦 Mutual Fund Research** - 80+ funds tracked with live data scraping
- **🧠 RAG-Powered Finance Advice** - ChromaDB vector store for document retrieval
- **❓ Intelligent Clarification** - Asks follow-up questions when information is missing
- **🔄 Asynchronous Processing** - FastAPI backend with background task handling
- **💾 State Management** - Tracks analysis flow and intermediate results

### Technical Highlights

- ✅ LangGraph state machine for complex workflows
- ✅ Google Gemini 2.5 Flash for reasoning
- ✅ Fuzzy matching for fund name normalization
- ✅ Multi-source web scraping with fallbacks
- ✅ Vector similarity search for finance knowledge
- ✅ Streamlit UI with real-time thinking visualization

---

## 📸 System Flow

### Stock Analysis Flow

```
User: "Should I buy TCS stock?"
    ↓
Classifier: category="stock", symbol needed
    ↓
Symbol Extractor: "TCS"
    ↓
News Scraping: 5 headlines from multiple sources
    ↓
Sentiment: {positive: 3, negative: 1, neutral: 1}
    ↓
Parallel Analysis:
    - Bull Handler: "Strong earnings, AI initiatives..."
    - Bear Handler: "Macro uncertainty, margin pressure..."
    ↓
Final Recommendation: "HOLD - Mixed signals..."
```

### Mutual Fund Flow

```
User: "Compare HDFC Flexi Cap and Parag Parikh Flexi Cap"
    ↓
Classifier: category="mf"
    ↓
MF Extractor: Fuzzy match → 2 funds found
    ↓
MF Scraper:
    - NAV: ₹756.32 vs ₹598.45
    - Returns: 18.2% vs 21.5% (3Y)
    - AUM: ₹54,231 Cr vs ₹87,432 Cr
    ↓
MF Handler: "Parag Parikh shows stronger returns..."
```

---

## 🛠️ Tech Stack

### Backend Core

- **LangGraph** - Multi-agent workflow orchestration
- **LangChain** - LLM abstraction and tooling
- **Google Gemini 2.5 Flash** - Primary reasoning model
- **FastAPI** - High-performance async API
- **ChromaDB** - Vector database for RAG
- **SQLAlchemy** - Database ORM

### AI & NLP

- **TextBlob** - Sentiment analysis
- **HuggingFace Embeddings** - Sentence transformers (all-MiniLM-L6-v2)
- **RapidFuzz** - Fuzzy string matching
- **BeautifulSoup4** - Web scraping

### Frontend

- **Streamlit** - Interactive dashboard
- **TypeScript** - Type-safe frontend (alternate UI)
- **CSS3** - Custom styling

### Data & Tools

- **PyPDF** - PDF document processing
- **Requests** - HTTP client
- **Python-dotenv** - Environment management

---

## 📦 Installation

### Prerequisites

```bash
Python 3.8+
pip or conda
Google Gemini API key
```

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/Rishi2403/Diversifi.git
cd Diversifi/backend
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required environment variables:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GROWW_API_KEY=your_groww_api_key  # Optional
GROWW_SECRET=your_groww_secret    # Optional
```

4. **Build the finance knowledge base** (Optional - for RAG)

```bash
# Place PDF documents in ./finance_pdfs/
python build_finance_kb.py
```

5. **Initialize the database**

```bash
python -c "from database import create_tables; create_tables()"
```

---

## 🎯 Usage

### Option 1: Streamlit Dashboard (Recommended)

```bash
streamlit run trading_streamlit.py
```

Features:

- 💬 Chat interface with conversation history
- 🧠 Real-time "thinking blocks" visualization
- 📊 Sentiment charts and analysis
- 🔄 Clarification handling

### Option 2: FastAPI Backend

```bash
uvicorn app:app --reload --port 8000
```

**API Endpoints:**

#### 1. Ask a Question

```bash
POST /ask
Content-Type: application/json

{
  "question": "Should I invest in HDFC Flexi Cap Fund?"
}

Response:
{
  "task_id": "uuid-here",
  "success": true
}
```

#### 2. Get Task Status

```bash
GET /get/{task_id}

Response:
{
  "status": "COMPLETED",
  "answer": "Based on analysis...",
  "events": [
    {"type": "result", "title": "Classifier", "message": "..."},
    {"type": "result", "title": "MF Handler", "message": "..."}
  ],
  "missing_info": null
}
```

#### 3. Provide Clarification

```bash
POST /clarify
Content-Type: application/json

{
  "task_id": "uuid-here",
  "answer": "I want to invest for 5 years"
}
```

### Option 3: Command Line Agent

```bash
python trading_lang.py
```

Interactive CLI interface for testing the workflow.

---

## 📊 Agent State Schema

```python
class AgentState(TypedDict):
    # Core
    question: str
    category: str                    # "stock" | "mf" | "general_finance"
    missing_info: Optional[str]      # What's missing from query
    confidence: float                # Classifier confidence
    reasoning: str                   # Classification reasoning
    clarification_used: bool         # Whether clarifier was triggered
    answer: str                      # Final answer

    # API Management
    status: str                      # "RUNNING" | "WAITING" | "COMPLETED" | "FAILED"
    events: List[Dict]               # Event log for debugging

    # Stock Analysis
    symbol: Optional[str]            # Stock ticker (e.g., "TCS")
    stock_sentiment: Optional[dict]  # News headlines + sentiment
    bull_analysis: Optional[str]     # Bullish perspective
    bear_analysis: Optional[str]     # Bearish perspective

    # Mutual Fund Analysis
    mf_matches: Optional[list]       # Matched fund URLs
    mf_categories: Optional[list]    # Fund categories (flexi cap, etc.)
    mf_scraped_data: Optional[list]  # NAV, AUM, returns data
    should_scrape: bool              # Whether to trigger scraper
```

---

## 🧪 Testing

### Test Individual Components

**Test News Scraping:**

```bash
python -c "from news_service import NewsService; print(NewsService().fetch_stock_news('AAPL', 3))"
```

**Test Sentiment Analysis:**

```bash
python -c "from helper_func import analyze_sentiment; print(analyze_sentiment(['Stock prices surge', 'Market faces uncertainty']))"
```

**Test MF Scraping:**

```bash
python mf_scrapper.py
```

**Test LangGraph Workflow:**

```bash
python trading_lang.py
# Enter: "What is the sentiment for Reliance stock?"
```

---

## 🗂️ Project Structure

```
Diversifi/
├── backend/
│   ├── agent.py                    # Simple news-only agent
│   ├── app.py                      # FastAPI backend with async handling
│   ├── trading_lang.py             # Main LangGraph workflow
│   ├── trading_streamlit.py        # Streamlit UI
│   ├── news_service.py             # Multi-source news scraper
│   ├── sentiment_service.py        # Sentiment analysis engine
│   ├── mf_scrapper.py              # Mutual fund data scraper
│   ├── helper_func.py              # Utility functions
│   ├── database.py                 # SQLAlchemy models
│   ├── build_finance_kb.py         # Vector DB builder
│   ├── mf_data.json                # 80+ mutual fund URLs
│   ├── requirements.txt            # Dependencies
│   ├── finance_pdfs/               # RAG documents (user-added)
│   └── finance_db/                 # ChromaDB vector store
├── frontend/
│   └── [TypeScript React app]
└── README.md
```

---

## 🔍 Key Features Explained

### 1. Intelligent Classification

The classifier uses Gemini to categorize queries with confidence scoring:

```python
{
  "category": "stock",
  "confidence": 0.95,
  "missing_info": "stock ticker symbol",
  "reasoning": "User asking about stock analysis but didn't specify which stock"
}
```

### 2. Fuzzy Matching for Mutual Funds

Uses RapidFuzz for flexible fund name matching:

```python
User input: "hdfc flexy cap"
Match: "HDFC Flexi Cap Fund" (score: 92)
```

### 3. Multi-Source News Aggregation

Scraping pipeline with intelligent fallbacks:

```
1. Try Finviz (most reliable)
2. If insufficient → Try Seeking Alpha
3. If still insufficient → Try MarketWatch
4. If all fail → Use mock data
```

### 4. RAG-Powered Finance Knowledge

ChromaDB vector search for finance PDFs:

```python
Query: "What is SIP?"
Retrieved chunks: [
  "Systematic Investment Plan (SIP) is...",
  "Benefits of SIP include rupee cost averaging..."
]
```

### 5. State Event Logging

Every node appends events for debugging and UI visualization:

```python
state["events"].append({
    "type": "result",
    "title": "Bull Handler",
    "message": "Identified 3 positive catalysts..."
})
```

---

## 🎨 Streamlit UI Features

### Real-Time Thinking Blocks

The Streamlit interface shows agent reasoning in real-time:

```
🧠 Thinking Blocks
┌────────────────────────┐
│ Classifier             │
│ - Category: stock      │
│ - Confidence: 0.95     │
└────────────────────────┘
┌────────────────────────┐
│ Symbol Extractor       │
│ - Symbol: TCS          │
└────────────────────────┘
┌────────────────────────┐
│ News & Sentiment       │
│ - Positive: 3          │
│ - Negative: 1          │
└────────────────────────┘
```

### Clarification Flow

```
User: "Should I buy this stock?"
Assistant: "I need more information: Which stock symbol are you referring to?"
User: "TCS"
Assistant: [Proceeds with analysis]
```

---

## 📈 Supported Instruments

### Stocks

All major exchanges supported:

- **Indian Stocks**: TCS, INFY, RELIANCE, WIPRO, HDFC, ICICI, etc.
- **US Stocks**: AAPL, MSFT, GOOGL, TSLA, AMZN, etc.
- **Global**: Any valid ticker symbol

### Mutual Funds (80+ Funds Tracked)

Categories:

- **Flexi Cap** - 20 funds (HDFC, Parag Parikh, Kotak, etc.)
- **Multi Cap** - 11 funds (Nippon, Kotak, Axis, etc.)
- **Large Cap** - 11 funds (HDFC, Invesco, Bandhan, etc.)
- **Large & Mid Cap** - 9 funds (HDFC, ICICI, Motilal Oswal, etc.)
- **Mid Cap** - 5 funds (Motilal Oswal, Nippon, etc.)
- **Small Cap** - 6 funds (Quant, SBI, HDFC, etc.)
- **Momentum** - 5 funds (Motilal Oswal, Quant, etc.)
- **Sectoral** - 5 funds (Technology, Pharma, etc.)
- **Value & Dividend** - 5 funds (Quantum, ICICI, Tata, etc.)

See `mf_data.json` for complete list with URLs.

---

## 🤖 AI Integration Details

### LLM Usage

**Primary Model**: Google Gemini 2.5 Flash

- Temperature: 0 (deterministic outputs)
- Used for: Classification, symbol extraction, analysis generation

### Prompt Engineering

**Classifier Prompt**:

```python
"""
Classify into: "mf", "stock", "general_finance", "unknown"
Return JSON with: category, confidence, missing_info, reasoning
"""
```

**Stock Analysis Prompt**:

```python
"""
Bullish Analyst: Focus on positives, catalysts, upside
Bearish Analyst: Focus on risks, red flags, downside
Final Handler: Synthesize both → Buy/Hold/Sell
"""
```

### Tools & Function Calling

```python
@tool
def get_finance_info(query: str) -> str:
    """Query finance knowledge base using similarity search"""
    vectordb = Chroma(persist_directory=CHROMA_DB)
    results = vectordb.similarity_search(query, k=4)
    return "\n\n".join([r.page_content for r in results])
```

---

## ⚙️ Configuration

### Rate Limiting

Web scraping includes delays to avoid blocking:

```python
# In news_service.py
time.sleep(random.uniform(1, 3))  # Random delay between requests
```

### Sentiment Thresholds

```python
# In sentiment_service.py
if combined_score > 0.1:
    return "positive"
elif combined_score < -0.1:
    return "negative"
else:
    return "neutral"
```

### Fuzzy Matching Threshold

```python
# In trading_lang.py
if best_score >= 70:  # 70% similarity required
    matched_urls.append(best_match)
```

---

## 🚧 Roadmap

### Phase 1: Enhanced Analysis

- [ ] Technical indicator integration (RSI, MACD, etc.)
- [ ] Portfolio optimization algorithms
- [ ] Risk assessment scoring
- [ ] Backtesting engine

### Phase 2: Real-Time Features

- [ ] WebSocket live price updates
- [ ] Real-time alert system
- [ ] Social media sentiment (Twitter/Reddit)
- [ ] News push notifications

### Phase 3: Advanced AI

- [ ] Fine-tuned finance LLM
- [ ] Multi-modal analysis (charts + text)
- [ ] Predictive modeling
- [ ] Personalized recommendations based on user history

### Phase 4: Integration

- [ ] Broker API integration (Zerodha, Groww)
- [ ] Automated trading capabilities
- [ ] Portfolio tracking dashboard
- [ ] Tax calculation and reporting

### Phase 5: Expansion

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Cryptocurrency analysis
- [ ] Global market coverage

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork the repository
2. Create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Make your changes
4. Add tests for new functionality
5. Run tests
   ```bash
   pytest tests/
   ```
6. Commit with clear messages
   ```bash
   git commit -m "Add: Bull/bear sentiment weighting"
   ```
7. Push and create a Pull Request

### Contribution Guidelines

- **Code Style**: Follow PEP 8 for Python
- **Type Hints**: Use type annotations
- **Documentation**: Update docstrings and README
- **Tests**: Add unit tests for new features
- **Commits**: Use conventional commit messages

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements
- 🌐 Internationalization

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributors

<a href="https://github.com/Rishi2403/Diversifi/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Rishi2403/Diversifi" />
</a>

---

## 📧 Contact & Support

- **Project Maintainer**: [@Rishi2403](https://github.com/Rishi2403)
- **Issues**: [GitHub Issues](https://github.com/Rishi2403/Diversifi/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Rishi2403/Diversifi/discussions)
- **Email**: [Contact via GitHub](https://github.com/Rishi2403)

---

## ⚠️ Disclaimer

**IMPORTANT**: This tool is for **educational and informational purposes only**.

- ❌ Not financial advice
- ❌ Not investment recommendations
- ❌ No guarantee of accuracy
- ❌ Past performance ≠ future results

**Always**:

- ✅ Conduct your own research
- ✅ Consult licensed financial advisors
- ✅ Understand risks before investing
- ✅ Only invest what you can afford to lose

The developers are not responsible for any financial losses incurred from using this tool.

---

## 🙏 Acknowledgments

### Technologies

- **LangGraph** - Agent orchestration framework
- **Google Gemini** - Powering AI reasoning
- **LangChain** - LLM tooling and abstractions
- **ChromaDB** - Vector database
- **HuggingFace** - Embedding models

### Data Sources

- **Finviz** - Stock news and data
- **Seeking Alpha** - Financial articles
- **MarketWatch** - Market news
- **TickerTape** - Mutual fund data

### Inspiration

Built with ❤️ for the Indian investing community, inspired by the need for accessible, AI-powered financial intelligence.

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Rishi2403/Diversifi&type=Date)](https://star-history.com/#Rishi2403/Diversifi&Date)

---

**Made with 🚀 by Rishi | Powered by LangGraph & Gemini AI**
