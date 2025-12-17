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

# Add category mapping to MF_LIST entries based on fund names
def categorize_funds():
    """Add category tags to funds based on their names"""
    for entry in MF_LIST:
        name = entry["mutual_fund_name"].lower()
        
        # Categorize based on name
        if "flexi cap" in name or "flexicap" in name:
            entry["category"] = "flexi cap"
        elif "multi cap" in name or "multicap" in name:
            entry["category"] = "multi cap"
        elif "large cap" in name and "mid" not in name:
            entry["category"] = "large cap"
        elif "large" in name and "mid" in name:
            entry["category"] = "large & mid cap"
        elif "mid cap" in name or "midcap" in name:
            entry["category"] = "mid cap"
        elif "small cap" in name or "smallcap" in name:
            entry["category"] = "small cap"
        elif "momentum" in name:
            entry["category"] = "momentum"
        elif "technology" in name or "digital" in name or "pharma" in name:
            entry["category"] = "sectoral"
        elif "value" in name or "dividend" in name:
            entry["category"] = "value/dividend"
        elif "conservative" in name or "hybrid" in name:
            entry["category"] = "hybrid"
        else:
            entry["category"] = "other"

categorize_funds()

def auto_suggest_categories(risk: str, horizon: str, goal: str) -> list:
    """Auto-suggest fund categories based on investment profile"""
    categories = []
    
    # Risk-based suggestions
    if risk:
        risk_lower = risk.lower()
        if "low" in risk_lower:
            categories.extend(["large cap", "hybrid"])
        elif "medium" in risk_lower or "moderate" in risk_lower:
            categories.extend(["flexi cap", "multi cap", "large & mid cap"])
        elif "high" in risk_lower or "aggressive" in risk_lower:
            categories.extend(["small cap", "mid cap", "momentum"])
    
    # Horizon-based suggestions
    if horizon:
        horizon_lower = horizon.lower()
        if "short" in horizon_lower or ("1" in horizon_lower and "year" in horizon_lower):
            if "large cap" not in categories:
                categories.append("large cap")
            categories.append("hybrid")
        elif "medium" in horizon_lower or ("3" in horizon_lower or "5" in horizon_lower):
            categories.extend(["flexi cap", "multi cap"])
        elif "long" in horizon_lower or ("7" in horizon_lower or "10" in horizon_lower):
            categories.extend(["small cap", "momentum"])
    
    # Goal-based suggestions
    if goal:
        goal_lower = goal.lower()
        if "wealth" in goal_lower or "growth" in goal_lower:
            categories.extend(["flexi cap", "small cap"])
        elif "steady" in goal_lower or "stable" in goal_lower:
            categories.extend(["large cap", "value/dividend"])
        elif "aggressive" in goal_lower:
            categories.extend(["small cap", "momentum", "sectoral"])
        elif "balanced" in goal_lower:
            categories.extend(["large & mid cap", "multi cap"])
    
    # Remove duplicates and return
    return list(set(categories))

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
    model="gemini-2.5-flash-lite",    
    temperature=0,
    api_key=google_api_key,
)

tools = [get_finance_info]
finance_agent = create_react_agent(llm, tools=tools)

def classifier_node(state: AgentState) -> AgentState:
    prompt = f"""
    You are a classification assistant for a finance helpdesk. Classify the user's question into one of the following categories exactly: "mf", "stock", "general_finance", "unknown".

    - "mf" = Mutual fund / SIP / NAV / SIP amount / SIP performance / fund recommendations / risk-based fund queries.
      * Examples: "suggest good mutual funds", "5 years medium risk", "best flexi cap funds", "SIP for aggressive growth"
    
    - "stock" = Stock / shares / ticker / price target / technical analysis questions.
      * Examples: "should I buy TCS", "RELIANCE analysis", "stock recommendation"
    
    - "general_finance" = Personal Finance, Budgeting, insurance, tax, loans, general investing concepts (not a specific fund or stock).
      * Examples: "how to save money", "tax planning tips", "insurance guide"
    
    - "unknown" = The question doesn't fit or lacks clarity OR is completely out of scope (like weather, recipes, general chat).
      * Examples: "hello", "what's the weather", "tell me a joke"

    IMPORTANT: 
    - Even vague MF queries like "tell me good funds" or "5 years medium risk" should be classified as "mf"
    - Mark as "unknown" ONLY if truly not related to finance
    - If it mentions risk/horizon/goals without specific fund names, still classify as "mf"

    For the given question, return a JSON object **only** (no extra commentary) with the following keys:
    - category: one of the four categories above
    - confidence: a float from 0.0 to 1.0 (how confident you are)
    - missing_info: For MF queries, ask for: "specific investment goals, risk tolerance, or investment horizon" if none mentioned. For other categories, note what's missing or null.
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

    state["category"] = data.get("category", "unknown")
    state["confidence"] = data.get("confidence", 0.0)
    if not state.get("clarification_used"):
        state["missing_info"] = data.get("missing_info")
    else:
        state["missing_info"] = None
    state["reasoning"] = data.get("reasoning", "")

    state["events"].append({
        "type": "result",
        "title": "Classifier",
        "message": f"Category: {state['category']}, missing info: {state['missing_info']}"
    })

    return state

def clarifier_node(state: AgentState) -> AgentState:
    missing = state.get("missing_info")

    if state.get("clarification_used"):
        return state

    if not missing or missing.strip() == "" or missing.lower() == "null":
        state["clarification_used"] = True
        return state

    if "_clarifier_response" not in state:
        state["clarification_used"] = True   
        state["status"] = "WAITING"

        state["events"].append({
            "type": "clarifier",
            "title": "Clarifier",
            "message": f"Waiting for clarification: {missing}"
        })

        raise Exception("WAITING_FOR_CLARIFICATION")

    # Response received
    ans = state.pop("_clarifier_response")
    state["question"] += " | " + ans

    state["events"].append({
        "type": "clarifier",
        "title": "Clarification Received",
        "message": f"User provided: {ans}"
    })

    return state

def handle_classifier_decision(state: AgentState) -> str:
    if state["category"] == "unknown":
        return "unknown_handler"

    if state["missing_info"] and not state["clarification_used"]:
        return "clarifier"

    if state["category"] == "mf":
        return "mf_handler"
    if state["category"] == "stock":
        return "stock_handler"
    if state["category"] == "general_finance":
        return "general_finance_handler"

    return END

# NEW: Handle invalid/unknown questions
def unknown_handler(state: AgentState) -> AgentState:
    """Handle questions that are out of scope or invalid"""
    state["answer"] = """❌ **Invalid Question**

I apologize, but I cannot process your question because:
- It appears to be outside the scope of finance/investment topics
- The question is too vague or unclear
- It doesn't relate to stocks, mutual funds, or financial planning

**I can help you with:**
✅ Stock analysis and recommendations
✅ Mutual fund comparisons and suggestions
✅ Investment strategies and portfolio advice
✅ Financial planning, budgeting, and taxation

Please ask a finance-related question, and I'll be happy to assist!"""
    
    state["events"].append({
        "type": "result",
        "title": "Invalid Question",
        "message": "Question is out of scope"
    })
    return state

def general_finance_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a financial advisor focused on personal finance topics like budgeting,
    savings, insurance, tax planning, and general investment strategy.
    Provide a simplified and short explanation.

    Question: "{state['question']}"
    """
    
    result = finance_agent.invoke({
        "messages": [{"role": "user", "content": prompt}]
    })
    
    final_message = result["messages"][-1]
    answer = final_message.content if hasattr(final_message, 'content') else str(final_message)
    
    state["answer"] = answer.strip()
    state["events"].append({
        "type": "result",
        "title": "General Finance",
        "message": state["answer"]
    })
    return state

def extract_mf_name(state: AgentState) -> AgentState:
    prompt = f"""
    You are a mutual fund category expert. Analyze the user's question and extract:

    1. **Mutual fund NAMES** (if mentioned) - extract full names like "HDFC Flexi Cap Fund", "Parag Parikh Flexi Cap"
    
    2. **Mutual fund CATEGORIES** - Based on the question, identify appropriate categories:
       - If risk tolerance mentioned:
         * Low risk → Large Cap, Hybrid, Debt funds
         * Medium risk → Flexi Cap, Multi Cap, Large & Mid Cap
         * High risk → Mid Cap, Small Cap, Sectoral
       
       - If investment horizon mentioned:
         * Short term (1-3 years) → Large Cap, Hybrid, Debt
         * Medium term (3-5 years) → Flexi Cap, Multi Cap, Large & Mid Cap
         * Long term (5+ years) → Small Cap, Mid Cap, Sectoral, Momentum
       
       - If goals mentioned:
         * Wealth creation → Flexi Cap, Multi Cap, Small Cap
         * Steady returns → Large Cap, Value/Dividend
         * Aggressive growth → Small Cap, Momentum, Sectoral
         * Balanced → Large & Mid Cap, Flexi Cap

    3. **Investment Profile** extracted:
       - Risk: low/medium/high (if mentioned)
       - Horizon: short/medium/long (if mentioned)
       - Goal: wealth/steady/aggressive/balanced (if inferred)

    Return ONLY a JSON object like:
    {{
        "names": [...],
        "categories": [...],
        "risk": "low/medium/high or null",
        "horizon": "short/medium/long or null",
        "goal": "wealth/steady/aggressive/balanced or null"
    }}

    Examples:
    - "5 years, medium risk" → categories: ["flexi cap", "multi cap", "large & mid cap"]
    - "high risk, long term" → categories: ["small cap", "mid cap", "momentum"]
    - "conservative investor" → categories: ["large cap", "hybrid"]

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
        risk_profile = result.get("risk")
        horizon = result.get("horizon")
        goal = result.get("goal")
    except Exception as e:
        print("JSON parse failed:", e)
        mf_names = []
        mf_categories = []
        risk_profile = None
        horizon = None
        goal = None

    # Auto-suggest categories if none extracted but risk/horizon/goal present
    if not mf_categories and (risk_profile or horizon or goal):
        mf_categories = auto_suggest_categories(risk_profile, horizon, goal)
        print(f"Auto-suggested categories based on profile: {mf_categories}")

    matched_urls = []

    # Match by specific fund names first
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
                "category": best_match.get("category", "")
            })

    # If no specific names matched, match by categories
    if not matched_urls and mf_categories:
        for category in mf_categories:
            cat_lower = category.lower()
            for entry in MF_LIST:
                entry_cat = entry.get("category", "").lower()
                if cat_lower in entry_cat or entry_cat in cat_lower:
                    matched_urls.append({
                        "name": entry["mutual_fund_name"],
                        "url": entry["url"],
                        "category": entry.get("category", "")
                    })

    # Remove duplicates
    seen = set()
    unique_matches = []
    for match in matched_urls:
        if match["name"] not in seen:
            seen.add(match["name"])
            unique_matches.append(match)

    state["mf_matches"] = unique_matches[:5]  # Limit to top 5
    state["mf_categories"] = mf_categories
    state["should_scrape"] = len(unique_matches) > 0

    state["events"].append({
        "type": "result",
        "title": "MF Extraction",
        "message": f"Extracted {len(unique_matches)} MF matches"
    })
    return state

def mf_scrape_node(state: AgentState) -> AgentState:
    if not state.get("should_scrape"):
        state["mf_scraped_data"] = []
        return state

    matches = state.get("mf_matches", [])
    scraped_list = []

    for m in matches:
        try:
            data = scrape_mf(m["url"])
            scraped_list.append({
                "name": m["name"],
                "url": m["url"],
                "category": m.get("category", ""),
                "data": data
            })
        except Exception as e:
            scraped_list.append({
                "name": m["name"],
                "url": m["url"],
                "category": m.get("category", ""),
                "data": {"error": f"Scraping failed: {str(e)}"}
            })

    state["mf_scraped_data"] = scraped_list
    state["events"].append({
        "type": "result",
        "title": "MF Scraper",
        "message": f"Scraped {len(scraped_list)} funds"
    })
    return state

def mf_handler(state: AgentState) -> AgentState:
    """Enhanced MF handler with precise fund name recommendations"""
    extracted = state.get("mf_scraped_data", [])
    query = state.get("question", "")
    categories = state.get("mf_categories", [])

    if not extracted:
        # No specific funds found - provide helpful guidance
        category_text = ", ".join(categories) if categories else "your criteria"
        
        state["answer"] = f"""❌ **No Matching Funds Found**

I couldn't find specific mutual funds matching your query.

**Based on your question, I recommend exploring these categories:**
{f"📊 **Suggested Categories:** {category_text}" if categories else ""}

**How to get better recommendations:**
1. Specify your risk tolerance (low/medium/high)
2. Mention investment horizon (3 years, 5 years, 10 years)
3. State your goal (wealth creation, steady returns, aggressive growth)

**Example queries:**
- "Suggest flexi cap funds for 5 years with medium risk"
- "Best large cap funds for conservative investors"
- "High growth small cap funds for 10 year horizon"

**Available categories:**
- **Low Risk:** Large Cap, Hybrid
- **Medium Risk:** Flexi Cap, Multi Cap, Large & Mid Cap
- **High Risk:** Small Cap, Mid Cap, Momentum, Sectoral
"""
        state["events"].append({
            "type": "result",
            "title": "MF Answer",
            "message": "No funds matched - provided guidance"
        })
        return state

    # Build detailed summary with fund names
    fund_details = []
    for item in extracted:
        name = item['name']
        category = item.get('category', 'N/A')
        data = item.get('data', {})
        
        detail = f"""
**{name}** ({category})
- NAV: ₹{data.get('NAV', 'N/A')}
- AUM: {data.get('AUM', 'N/A')}
- 1Y Return: {data.get('Returns', {}).get('1 Year Returns', 'N/A')}
- 3Y Return: {data.get('Returns', {}).get('3 Year Returns', 'N/A')}
- 5Y Return: {data.get('Returns', {}).get('5 Year Returns', 'N/A')}
"""
        fund_details.append(detail)

    funds_summary = "\n".join(fund_details)
    category_context = f" for {', '.join(categories)}" if categories else ""

    prompt = f"""
    You are a mutual fund research analyst providing PRECISE recommendations{category_context}.

    User question: "{query}"

    **Analyzed Funds:**
    {funds_summary}

    **Instructions:**
    1. ALWAYS mention the EXACT fund names in your response
    2. Compare the specific funds listed above with their actual data
    3. Explain WHY these funds suit the user's risk/horizon/goal
    4. Provide clear ranking: Best → Good → Average
    5. Give actionable recommendation with specific fund name(s)
    6. Mention key metrics (NAV, returns, AUM) for each fund
    7. Be concise but data-driven

    **Output Format:**
    📊 **Analysis of {categories[0] if categories else 'Selected'} Funds:**

    🥇 **Top Pick:** [Exact Fund Name]
    - NAV: [value] | 1Y: [%] | 3Y: [%] | 5Y: [%]
    - Why: [specific reasons - relates to user's risk/horizon/goal]

    🥈 **Runner-up:** [Exact Fund Name]  
    - NAV: [value] | 1Y: [%] | 3Y: [%] | 5Y: [%]
    - Why: [specific reasons]

    💡 **Final Recommendation:** 
    Invest in [Exact Fund Name(s)] because [clear reasoning that addresses user's investment profile]

    **Risk Note:** [Brief risk assessment matching user's risk tolerance]
    """

    resp = llm.invoke(prompt)
    state["answer"] = resp.content.strip()
    
    state["events"].append({
        "type": "result",
        "title": "MF Answer",
        "message": state["answer"]
    })
    return state

# Stock handlers remain the same...
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
        state["missing_info"] = "Which stock symbol are you referring to?"
        return state  

    state["symbol"] = symbol
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
    
    state['stock_sentiment'] = {
        "headlines": headlines,
        "news_sentiment": sentiment_summary,
    }
    state["events"].append({
        "type": "result",
        "title": "Stock Sentiment",
        "message": f"Sentiment Summary: {sentiment_summary}"
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
    Provide a bullish Buy recommendation if justified. Keep the output super concise under 100 words.
    """

    resp = llm.invoke(prompt)
    state["bull_analysis"] = resp.content.strip()
    bull_text = state["bull_analysis"]
    state["events"].append({
        "type": "result",
        "title": "Bullish Review",
        "message": f"Bullish Analysis: {bull_text}"
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
    Provide a Sell recommendation if justified. Keep the output super concise under 100 words.
    """

    resp = llm.invoke(prompt)
    state["bear_analysis"] = resp.content.strip()
    bear_text = state["bear_analysis"]
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
    final_ans = state["answer"]

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
    workflow.add_node("unknown_handler", unknown_handler)  # NEW

    workflow.add_node("stock_sentiment", stock_sentiment)
    workflow.add_node("stock_handler", stock_handler)
    workflow.add_node("bull_handler", bull_handler)
    workflow.add_node("bear_handler", bear_handler)
    workflow.add_node("symbol_extractor", symbol_extractor)

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
            "unknown_handler": "unknown_handler",  # NEW
            END: END
        }
    )
    workflow.add_edge("clarifier", "classifier")
    workflow.add_edge("unknown_handler", END)  # NEW
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
    initial_state: AgentState = {
        "question": question_input,
        "category": "",
        "missing_info": None,
        "confidence": 0.0,
        "reasoning": "",
        "clarification_used": False,
        "answer": "",
        "status": "RUNNING",
        "events": [],
        "symbol": None,
        "stock_sentiment": None,
        "bull_analysis": None,
        "bear_analysis": None,
        "mf_matches": None,
        "mf_categories": None,
        "mf_scraped_data": None,
        "should_scrape": False
    }

    result = graph.invoke(initial_state)
    print("\n\n✅ Final Answer:\n")
    print(result.get("answer", "No answer generated"))