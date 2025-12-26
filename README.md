# Diversifi

**AI-Powered Financial Intelligence Platform**

Diversifi is a comprehensive financial analysis platform leveraging LangGraph-based multi-agent architecture for stock market analysis, mutual fund research, and personalized financial advisory.

## Overview

Diversifi provides intelligent financial analysis across three domains:

1. **Stock Market Analysis** - Real-time news sentiment, bull/bear analysis, and trading recommendations
2. **Mutual Fund Research** - Fund comparison, NAV tracking, and performance analysis
3. **General Finance Advisory** - Personal finance guidance using RAG (Retrieval Augmented Generation)

## Architecture

The platform uses a multi-agent workflow where user queries are classified and routed to specialized agents:

- **Classifier Node** - Categorizes queries (`stock`, `mf`, `general_finance`)
- **Stock Agents** - Symbol extraction, news scraping, sentiment analysis, bull/bear perspectives
- **Mutual Fund Agents** - Fuzzy name matching, NAV/AUM/returns scraping, fund comparison
- **Finance Agent** - RAG-based answers using vector database
- **Clarifier Node** - Requests missing information when needed

## Features

- Multi-agent intelligence powered by LangGraph and Google Gemini 2.5 Flash
- Real-time news scraping from Finviz, Seeking Alpha, and MarketWatch
- Sentiment analysis using TextBlob with financial keyword detection
- Bull/bear analysis for balanced stock recommendations
- 80+ mutual funds tracked with live data scraping
- RAG-powered finance advice using ChromaDB vector store
- Asynchronous processing with FastAPI backend
- React frontend with modern UI

## Tech Stack

**Backend**: Flask, LangGraph, LangChain, Google Gemini 2.5 Flash, ChromaDB, SQLAlchemy, TextBlob, BeautifulSoup4, RapidFuzz

**Frontend**: React, TypeScript, CSS3

**AI/NLP**: HuggingFace Embeddings (all-MiniLM-L6-v2), Sentiment Analysis

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Google Gemini API key

### Backend Setup

1. **Clone the repository**

```bash
git clone https://github.com/Rishi2403/Diversifi.git
cd Diversifi/backend
```

2. **Install Python dependencies**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables**

Create a `.env` file in the backend directory:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

4. **Build the finance knowledge base (Optional)**

```bash
# Place PDF documents in ./finance_pdfs/
python build_finance_kb.py
```

5. **Initialize the database**

```bash
python -c "from database import create_tables; create_tables()"
```

### Frontend Setup

1. **Navigate to frontend directory**

```bash
cd ../frontend
```

2. **Install Node dependencies**

```bash
npm install
```

## Usage

### Running the Application

1. **Start the Flask backend**

```bash
cd backend
flask app.py
```

2. **Start the React frontend**

```bash
cd frontend
npm run dev
```

3. **Access the application**

Open your browser and navigate to the URL provided by the React dev server (typically `http://localhost:5173`).

## Project Structure

```
Diversifi/
├── backend/
│   ├── app.py                      # Flask backend
│   ├── trading_lang.py             # LangGraph workflow
│   ├── news_service.py             # News scraper
│   ├── sentiment_service.py        # Sentiment analysis
│   ├── mf_scrapper.py              # Mutual fund scraper
│   ├── database.py                 # Database models
│   ├── build_finance_kb.py         # Vector DB builder
│   ├── mf_data.json                # 80+ mutual fund URLs
│   └── requirements.txt            # Dependencies
├── frontend/
│   └── [React TypeScript app]
└── README.md
```

## Supported Instruments

**Stocks**: All major exchanges (Indian: TCS, INFY, RELIANCE; US: AAPL, MSFT, GOOGL; Global: any valid ticker)

**Mutual Funds**: 80+ funds across Flexi Cap, Multi Cap, Large Cap, Large & Mid Cap, Mid Cap, Small Cap, Momentum, Sectoral, Value & Dividend categories. See `mf_data.json` for details.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Style**: Follow PEP 8 for Python, ESLint for TypeScript

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

**IMPORTANT**: This tool is for educational and informational purposes only.

- Not financial advice or investment recommendations
- No guarantee of accuracy
- Past performance does not indicate future results
- Always conduct your own research and consult licensed financial advisors
- Only invest what you can afford to lose

The developers are not responsible for any financial losses incurred from using this tool.


---

**Built with LangGraph & Google Gemini AI**
