import json
import warnings

from mf_scrapper import scrape_mf
from helper_func import analyze_sentiment, normalize_fund_name
from news_service import NewsService
warnings.simplefilter(action='ignore', category=FutureWarning)
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import find_dotenv, load_dotenv
from langgraph.graph import StateGraph, END
from typing import Dict, Optional, TypedDict, List
from langchain.tools import tool
from langchain_community.vectorstores import Chroma 
from langchain_huggingface import HuggingFaceEmbeddings
import os
from langgraph.prebuilt import create_react_agent
from rapidfuzz import fuzz

load_dotenv(find_dotenv())
google_api_key = os.getenv("GOOGLE_API_KEY")

CHROMA_DB = "./finance_db"
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

with open("mf_data.json", "r", encoding="utf-8") as f:
    MF_LIST = json.load(f)

@tool
def get_finance_info(query: str) -> str:
    """
    Query the stored finance knowledge base using similarity search.
    Returns the top relevant chunks.
    """
    print("TOOL USED\n")
    vectordb = Chroma(
        persist_directory=CHROMA_DB,
        embedding_function=embeddings
    )

    results = vectordb.similarity_search(query, k=4)

    if not results:
        return "No relevant finance info found in knowledge base."

    return "\n\n---\n".join([r.page_content for r in results])

class AgentState(TypedDict):
    question: str
    category: str
    missing_info: Optional[str]
    confidence: float
    reasoning: str
    clarification_used: bool
    answer: str

    status: str
    events: List[Dict]

    symbol: Optional[str]
    stock_sentiment: Optional[dict]
    bull_analysis: Optional[str]
    bear_analysis: Optional[str]
    mf_matches: Optional[list]
    mf_categories: Optional[list]
    mf_scraped_data: Optional[list]
    should_scrape: bool

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",    
    temperature=0,
    api_key=google_api_key,
)


tools = [get_finance_info]
finance_agent  = create_react_agent(llm, tools=tools)

## same for stocks and mutual funds
def classifier_node(state: AgentState) -> AgentState:
    prompt = f"""
    You are a classification assistant for a finance helpdesk. Classify the user's question into one of the following categories exactly: "mf", "stock", "general_finance", "unknown".

    - "mf" = Mutual fund / SIP / NAV / SIP amount / SIP performance related questions.
    - "stock" = Stock / shares / ticker / price target / technical analysis questions.
    - "general_finance" = Personal Finance, Budgeting, insurance, tax, loans, general investing concepts (not a specific fund or stock).
    - "unknown" = The question doesn't fit or lacks clarity.


    For the given question, return a JSON object **only** (no extra commentary) with the following keys:
    - category: one of the four categories above
    - confidence: a float from 0.0 to 1.0 (how confident you are)
    - missing_info: a short string describing what essential information is missing (e.g., "stock ticker", "timeframe, amount"), or null if nothing missing
    - reasoning: a 1-2 sentence explanation for your classification


    Question: "{state["question"]}"


    Respond only with valid JSON.
    """

    resp = llm.invoke(prompt)
    text = resp.content.strip()
   


# Try to parse JSON
    try:
        data = json.loads(text)
    except Exception:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                data = json.loads(text[start:end+1])
            except Exception:
                data = {}
        else:
            data = {}

    print(f"\n\nMissing Data: {data.get('missing_info')}")

    state["category"] = data.get("category", "unknown")
    state["confidence"] = data.get("confidence", 0.0)
    state["missing_info"] = data.get("missing_info")
    state["reasoning"] = data.get("reasoning", "")

    state["events"].append({
        "type": "result",
        "title": "Classifier",
        "message": f"Category: {state['category']}, missing info: {state['missing_info']}"
    })

    return state


def clarifier_node(state: AgentState) -> AgentState:
    missing = state.get("missing_info")

    if not missing or missing.strip() == "" or missing.lower() == "null":
        state["clarification_used"] = True
        return state

    if "_clarifier_response" not in state:
        state["status"] = "WAITING"
        state["events"].append({
            "type": "clarifier",
            "title": "Clarifier",
            "message": f"Waiting for clarification: {missing}"
        })
        raise Exception("WAITING_FOR_CLARIFICATION")

    ans = state.pop("_clarifier_response")
    state["question"] += " | " + ans
    state["clarification_used"] = True

    state["events"].append({
        "type": "clarifier",
        "title": "Clarification Received",
        "message": f"User provided: {ans}"
    })

    return state


def handle_classifier_decision(state: AgentState) -> str:
    if state["category"] == "unknown":
        print("\n\n Question out of model's scope. Exiting.")
        return END

    if state["missing_info"] and not state["clarification_used"]:
        return "clarifier"

    if state["category"] == "mf":
        print("\n\nQuestion Classified Into Category Mutual Funds")
        return "mf_handler"
    if state["category"] == "stock":
        print("\n\nQuestion Classified Into Category Stock Market")
        return "stock_handler"
    if state["category"] == "general_finance":
        print("\n\nQuestion Classified Into Category General Finance")
        return "general_finance_handler"

    return END

#General finance
def general_finance_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a financial advisor focused on personal finance topics like budgeting,
    savings, insurance, tax planning, and general investment strategy.
    Provide a simplified and helpful explanation.

    Question: "{state['question']}"
    """
    
    # Invoke the agent with proper input format
    result = finance_agent.invoke({
        "messages": [{"role": "user", "content": prompt}]
    })
    
    # Extract the final answer from the result
    # The result contains a list of messages, get the last one
    final_message = result["messages"][-1]
    answer = final_message.content if hasattr(final_message, 'content') else str(final_message)
    
    state["answer"] = answer.strip()
    print("\n\n📍 Finance Advisor Response:\n", state["answer"])
    state["events"].append({
        "type": "result",
        "title": "General Finance",
        "message": state["answer"]
    })
    return state

#MF Related
from rapidfuzz import fuzz
import json

def extract_mf_name(state: AgentState) -> AgentState:
    prompt = f"""
    From the user question, extract:

    1. Mutual fund NAMES (if mentioned)
    2. Mutual fund CATEGORIES (large cap, mid cap, multicap, flexicap, elss, debt, etc.)

    Return ONLY a JSON object like:
    {{
        "names": [...],
        "categories": [...]
    }}

    Question: "{state['question']}"
    """

    resp = llm.invoke(prompt)


    raw = resp.content.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()

    try:
        result = json.loads(raw)
        mf_names = result.get("names", [])
        mf_categories = result.get("categories", [])
    except Exception as e:
        print("JSON parse failed:", e)
        mf_names = []
        mf_categories = []

    print("\nExtracted Names:", mf_names)
    print("Extracted Categories:", mf_categories)

    matched_urls = []

    for user_name in mf_names:
        best_match = None
        best_score = 0

        norm_user = normalize_fund_name(user_name)

        for entry in MF_LIST:
            norm_entry = normalize_fund_name(entry["mutual_fund_name"])

            score = fuzz.token_set_ratio(norm_user, norm_entry)

            if score > best_score:
                best_score = score
                best_match = entry

        if best_score >= 70:
            matched_urls.append({
                "name": best_match["mutual_fund_name"],
                "url": best_match["url"],
                "category": best_match.get("category")
            })


    if not matched_urls and mf_categories:
        for category in mf_categories:
            for entry in MF_LIST:
                if category.lower() in entry.get("category", "").lower():
                    matched_urls.append({
                        "name": entry["mutual_fund_name"],
                        "url": entry["url"],
                        "category": entry.get("category")
                    })

    state["mf_matches"] = matched_urls
    state["mf_categories"] = mf_categories
    state["should_scrape"] = len(matched_urls) > 0

    print("\nMatched Funds:", matched_urls)
    print("\nRaw LLM output:", resp.content)

    print(f"\n\nExtracted Fund names from prompt: {resp.content}")

    state["events"].append({
        "type": "result",
        "title": "MF Extraction",
        "message": f"Extracted MF matches: {matched_urls}"
    })
    return state

def mf_scrape_node(state: AgentState) -> AgentState:
    if not state.get("should_scrape"):
        print("\nSkipping scraper → No MF match found.")
        state["mf_scraped_data"] = []
        return state

    matches = state.get("mf_matches", [])
    scraped_list = []

    print("\nScraping matched mutual funds...\n")

    for m in matches:
        try:
            data = scrape_mf(m["url"])
            scraped_list.append({
                "name": m["name"],
                "url": m["url"],
                "data": data
            })
        except Exception as e:
            scraped_list.append({
                "name": m["name"],
                "url": m["url"],
                "data": f"Scraping failed: {str(e)}"
            })

    state["mf_scraped_data"] = scraped_list
    print(f"\n\nExtracted mutual fund data from tkinter: {state['mf_scraped_data']}")
    state["events"].append({
        "type": "result",
        "title": "MF Scraper",
        "message": f"Scraped {len(scraped_list)} funds"
    })
    return state

def mf_handler(state: AgentState) -> AgentState:
    extracted = state.get("mf_scraped_data", [])
    query = state.get("question", "")

    extracted_summary = ""
    if extracted:
        extracted_summary = "\n\n".join([
            f"{item['name']}:\nURL: {item['url']}\nExtracted Data:\n{json.dumps(item['data'], indent=2)}"
            for item in extracted
        ])

    prompt = f"""
    You are a mutual fund research analyst.

    User question: "{query}"

    Below is any scraped data (if available):
    {extracted_summary or "No scraped data available."}

    Your tasks:
    - Interpret whatever data is available.
    - If some requested funds have no data, provide category-level or general insights.
    - Give a clear comparison, reasoning, and a final actionable recommendation.

    Keep the output concise, structured, and expert-level.
    """

    resp = llm.invoke(prompt)
    state["answer"] = resp.content.strip()
    print("\n\nFinal Mutual Fund Recommendation:\n", state["answer"])
    state["events"].append({
        "type": "result",
        "title": "MF Answer",
        "message": state["answer"]
    })
    return state

## Stocks Related
def symbol_extractor(state: AgentState) -> AgentState:
    prompt = f"""
    You are an AI whose job is to extract the Stock Ticker Symbol from a user question, usually based on Indian stock market.
    Only reply with the symbol itself (e.g. TMPV, ADANIPOWER, RELIANCE).
    If no symbol exists in the question, reply with "NONE".

    Question: "{state['question']}"
    """

    resp = llm.invoke(prompt)
    symbol = resp.content.strip().upper()

    if symbol == "NONE" or len(symbol) > 15: 
        print("\n\n Could not determine the stock symbol. Ask again.")
        state["missing_info"] = "Which stock symbol are you referring to?"
        return state  

    state["symbol"] = symbol
    print(f"\n\nExtracted Stock Symbol: {symbol}")
    state["events"].append({
        "type": "result",
        "title": "Symbol Extractor",
        "message": f"Extracted symbol: {symbol}"
    })
    return state

def stock_sentiment(state: AgentState) -> AgentState:

    symbol = state.get("symbol", "")
    news_service = NewsService()
    news_items = news_service.fetch_stock_news(symbol, limit=5)
    headlines = [item['title'] for item in news_items]
    
    sentiment_summary = analyze_sentiment(headlines)
    
    print(f"\n\n{sentiment_summary}")
    
    state['stock_sentiment'] = {
        "headlines": headlines,
        "news_sentiment": sentiment_summary,
        # "twitter_sentiment": twitter_sentiment
    }
    state["events"].append({
        "type": "result",
        "title": "Stock Sentiment",
        "message": f"Sentiment  Summary: {sentiment_summary}"
    })
    
    return state

def bull_handler(state: AgentState) -> dict:
    sentiment_data = state.get('stock_sentiment', {})
    headlines = sentiment_data.get('headlines', [])
    sentiment_summary = sentiment_data.get('news_sentiment', {})

    prompt = f"""
    You are a bullish stock analyst. User asked: "{state['question']}".
    Analyze from a positive/bullish perspective only.

    News Headlines: {headlines}
    Sentiment: {sentiment_summary}

    Explain why the stock may rise, opportunities, catalysts, investor confidence, and upside targets.
    Provide a bullish Buy recommendation if justified. Keep all of it very concise.
    """

    resp = llm.invoke(prompt)
    state["bull_analysis"] = resp.content.strip()
    print("\n\nBullish Analysis:\n",state["bull_analysis"])
    bull_text = state["bull_analysis"]
    state["events"].append({
        "type": "result",
        "title": "Bullish Review",
        "message": f"Bullish  Analysis: {bull_text}"
    })
    return {"bull_analysis": bull_text}

def bear_handler(state: AgentState) -> dict:
    sentiment_data = state.get('stock_sentiment', {})
    headlines = sentiment_data.get('headlines', [])
    sentiment_summary = sentiment_data.get('news_sentiment', {})

    prompt = f"""
    You are a bearish stock analyst. User asked: "{state['question']}".
    Analyze from a negative/bearish perspective only.

    News Headlines: {headlines}
    Sentiment: {sentiment_summary}

    Explain risks, weaknesses, uncertainty, red flags, and downside price levels.
    Provide a Sell recommendation if justified. Keep all of it very concise.
    """

    resp = llm.invoke(prompt)
    state["bear_analysis"] = resp.content.strip()
    bear_text = state["bear_analysis"]
    print("\n\nBearish Analysis:\n",state["bear_analysis"])
    state["events"].append({
        "type": "result",
        "title": "Bearish Review",
        "message": f"Bearish Analysis: {bear_text}"
    })
    return {"bear_analysis": bear_text}

def stock_handler(state: AgentState) -> AgentState:
    bull = state.get("bull_analysis", "No bullish analysis available")
    bear = state.get("bear_analysis", "No bearish analysis available")

    prompt = f"""
    You are a balanced financial advisor. Summarize the bullish and bearish perspectives
    below and provide a final actionable recommendation.

    Bullish View:
    {bull}

    Bearish View:
    {bear}

    Give a clear final decision (Buy / Hold / Sell), including price action expectations,
    risk factors, and short-term vs long-term outlook. Be concise and professional.
    """

    resp = llm.invoke(prompt)
    state["answer"] = resp.content.strip()
    final_ans=state["answer"]

    print("\n\nFinal Balanced Stock Recommendation:\n", final_ans)
    state["events"].append({
        "type": "result",
        "title": "Final Review",
        "message": f"Stock Final Analysis: {final_ans}"
    })
    return state

def build_graph():

    workflow = StateGraph(AgentState)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("clarifier", clarifier_node)

    workflow.add_node("stock_sentiment", stock_sentiment)
    workflow.add_node("stock_handler", stock_handler)
    workflow.add_node("bull_handler", bull_handler)
    workflow.add_node("bear_handler", bear_handler)
    workflow.add_node("symbol_extractor",symbol_extractor)

    workflow.add_node("mf_extract", extract_mf_name)
    workflow.add_node("mf_scrape", mf_scrape_node)
    workflow.add_node("mf_handler", mf_handler)

    workflow.add_node("general_finance_handler", general_finance_handler)

    workflow.set_entry_point("classifier")

    workflow.add_conditional_edges(
        "classifier",
        handle_classifier_decision,
        {
            "clarifier": "clarifier",
            "mf_handler": "mf_extract",
            "stock_handler": "symbol_extractor",
            "general_finance_handler": "general_finance_handler",
            END: END
        }
    )
    workflow.add_edge("clarifier", "classifier")
    workflow.add_edge("symbol_extractor", "stock_sentiment")

    workflow.add_edge("stock_sentiment", "bull_handler")
    workflow.add_edge("stock_sentiment", "bear_handler")

    workflow.add_edge("bull_handler", "stock_handler")
    workflow.add_edge("bear_handler", "stock_handler")


    workflow.add_conditional_edges(
        "mf_extract",
        lambda state: "scrape" if state.get("should_scrape") else "skip",
        {
            "scrape": "mf_scrape",
            "skip": "mf_handler"
        }
    )
    workflow.add_edge("mf_scrape", "mf_handler")

    return workflow.compile()


if __name__ == "__main__":
    question_input = input("\n\nEnter your question: ")

    graph = build_graph()
    # png = graph.get_graph().draw_mermaid_png()
    # with open("workflow.png","wb") as f:
    #     f.write(png)
    # print("Saved workflow diagram to workflow.png")
    initial_state: AgentState = {
        "question": question_input,
        "category": "",
        "missing_info": None,
        "confidence": 0.0,
        "reasoning": "",
        "clarification_used": False,
        "answer": "",
    }

    result = graph.invoke(initial_state)
    print("\n\n\n--- Workflow Completed ---")
    # print(result)


