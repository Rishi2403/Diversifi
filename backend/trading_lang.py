import json
import warnings

from helper_func import analyze_sentiment
from news_service import NewsService
warnings.simplefilter(action='ignore', category=FutureWarning)
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import find_dotenv, load_dotenv
from langgraph.graph import StateGraph, END
from typing import Optional, TypedDict, List
from langchain.tools import tool
from langchain_community.vectorstores import Chroma 
from langchain_community.embeddings import HuggingFaceEmbeddings
import os
from langgraph.prebuilt import create_react_agent


load_dotenv(find_dotenv())
google_api_key = os.getenv("GOOGLE_API_KEY")

CHROMA_DB = "./finance_db"
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

@tool
def get_finance_info(query: str) -> str:
    """
    Query the stored finance knowledge base using similarity search.
    Returns the top relevant chunks.
    """
    print("TOOL USED\n\n\n\n\n\n\n")
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
    symbol: Optional[str] 
    stock_sentiment: Optional[dict]
    mf_sentiment:Optional[dict]
    bear_analysis:Optional[dict]
    bull_analysis:Optional[dict]


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",    
    temperature=0,
    api_key=google_api_key,
)

# llm_with_tools = llm.bind_tools([get_finance_info])

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

    return state


def clarifier_node(state: AgentState) -> AgentState:
    """Ask ONE clarifying question only if missing_info exists."""

    missing = state["missing_info"]
    if not missing or missing.strip() == "" or missing=="null" or missing=="Null":
        state["clarification_used"] = True
        return state

    print(f"\nClarifier: I need more info: {missing}")
    ans = input("\nYour answer: ").strip()

    state["question"] = state["question"] + " | " + ans
    state["clarification_used"] = True
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


def mf_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a Mutual Fund expert. Answer the user's question in a very clear,
    simplified, and actionable way. Provide fund suggestions only if user intent is clear,
    otherwise explain considerations such as risk level, time horizon, and goals.

    Question: "{state["question"]}"
    """
    resp = llm.invoke(prompt)
    state["answer"] = resp.content.strip()
    print("\n\n📍 Mutual Fund Expert Response:\n", state["answer"])
    return state

def general_finance_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a financial advisor focused on personal finance topics like budgeting,
    savings, insurance, tax planning, and general investment strategy.
    Provide a simplified and helpful explanation.

    Question: "{state['question']}"
    """
    
    # Invoke the agent directly
    answer = finance_agent.run(prompt)  # use run() instead of invoke()
    
    state["answer"] = answer.strip()
    print("\n\n📍 Finance Advisor Response:\n", state["answer"])
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

    print("\n\nFinal Balanced Stock Recommendation:\n", state["answer"])
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

    workflow.add_node("mf_handler", mf_handler)
    workflow.add_node("general_finance_handler", general_finance_handler)

    workflow.set_entry_point("classifier")

    # Add routing/edges
    workflow.add_conditional_edges(
        "classifier",
        handle_classifier_decision,
        {
            "clarifier": "clarifier",
            "mf_handler": "mf_handler",
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

    return workflow.compile()


if __name__ == "__main__":
    question_input = input("\n\nEnter your question: ")

    graph = build_graph()
    png = graph.get_graph().draw_mermaid_png()
    with open("workflow.png","wb") as f:
        f.write(png)
    print("Saved workflow diagram to workflow.png")
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


