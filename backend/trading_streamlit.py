import os
import json
import warnings
from typing import Optional, TypedDict, List

import streamlit as st
from dotenv import load_dotenv, find_dotenv

# --- Original imports from your demo ---
import warnings
from helper_func import analyze_sentiment
from news_service import NewsService
warnings.simplefilter(action='ignore', category=FutureWarning)
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import find_dotenv, load_dotenv
from langgraph.graph import StateGraph, END
from typing import Optional, TypedDict, List
import os

# Load env
load_dotenv(find_dotenv())
google_api_key = os.getenv("GOOGLE_API_KEY")

# Initialize LLM (will raise helpful error if not configured)
try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        api_key=google_api_key,
    )
except Exception as e:
    llm = None

# --- Agent State ---
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
    mf_sentiment: Optional[dict]
    bear_analysis: Optional[dict]
    bull_analysis: Optional[dict]

# --- Preserve your original node implementations with small adapter to use llm.invoke ---
# (We re-use your exact logic; only change is using llm.invoke where needed.)

def safe_llm_invoke(prompt: str) -> str:
    if llm is None:
        raise RuntimeError("LLM is not configured. Set GOOGLE_API_KEY in your environment to use real LLM.")
    resp = llm.invoke(prompt)
    return resp.content.strip()

# classifier_node (uses LLM)
def classifier_node(state: AgentState) -> AgentState:
    prompt = f"""
    You are a classification assistant for a finance helpdesk. Classify the user's question into one of the following categories exactly: "mf", "stock", "general_finance", "unknown".

    - "mf" = Mutual fund / SIP / NAV / SIP amount / SIP performance related questions.
    - "stock" = Stock / shares / ticker / price target / technical analysis questions.
    - "general_finance" = Budgeting, insurance, tax, loans, general investing concepts (not a specific fund or stock).
    - "unknown" = The question doesn't fit or lacks clarity.

    For the given question, return a JSON object **only** (no extra commentary) with the following keys:
    - category: one of the four categories above
    - confidence: a float from 0.0 to 1.0 (how confident you are)
    - missing_info: a short string describing what essential information is missing (e.g., "stock ticker", "timeframe, amount"), or null if nothing missing
    - reasoning: a 1-2 sentence explanation for your classification

    Question: "{state['question']}"

    Respond only with valid JSON.
    """

    text = safe_llm_invoke(prompt)

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

    state['category'] = data.get('category', 'unknown')
    state['confidence'] = float(data.get('confidence', 0.0))
    state['missing_info'] = data.get('missing_info')
    state['reasoning'] = data.get('reasoning', '')

    return state


def clarifier_node(state: AgentState) -> AgentState:
    missing = state['missing_info']
    if not missing or str(missing).strip() == "" or str(missing).lower() == "null":
        state['clarification_used'] = True
        return state

    # For Streamlit, clarifier will be handled in UI. We keep this function for completeness.
    state['clarification_used'] = True
    return state


def handle_classifier_decision(state: AgentState) -> str:
    if state['category'] == 'unknown':
        return END
    if state['missing_info'] and not state['clarification_used']:
        return 'clarifier'
    if state['category'] == 'mf':
        return 'mf_handler'
    if state['category'] == 'stock':
        return 'stock_handler'
    if state['category'] == 'general_finance':
        return 'general_finance_handler'
    return END


def mf_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a Mutual Fund expert. Answer the user's question in a very clear,
    simplified, and actionable way. Provide fund suggestions only if user intent is clear,
    otherwise explain considerations such as risk level, time horizon, and goals.

    Question: "{state['question']}"
    """
    text = safe_llm_invoke(prompt)
    state['answer'] = text
    return state


def general_finance_handler(state: AgentState) -> AgentState:
    prompt = f"""
    You are a financial advisor focused on personal finance topics like budgeting,
    savings, insurance, tax planning, and general investment strategy.
    Provide a simplified and helpful explanation.

    Question: "{state['question']}"
    """
    text = safe_llm_invoke(prompt)
    state['answer'] = text
    return state


def symbol_extractor(state: AgentState) -> AgentState:
    prompt = f"""
    You are an AI whose job is to extract the Stock Ticker Symbol from a user question, usually based on Indian stock market.
    Only reply with the symbol itself (e.g. TMPV, ADANIPOWER, RELIANCE).
    If no symbol exists in the question, reply with "NONE".

    Question: "{state['question']}"
    """
    text = safe_llm_invoke(prompt)
    symbol = text.strip().upper()
    if symbol == 'NONE' or len(symbol) > 15 or symbol == '':
        state['missing_info'] = 'Which stock symbol are you referring to?'
        return state
    state['symbol'] = symbol
    return state


def stock_sentiment(state: AgentState) -> AgentState:
    symbol = state.get('symbol', '')
    news_service = NewsService()
    news_items = news_service.fetch_stock_news(symbol, limit=5)
    headlines = [item['title'] for item in news_items]
    sentiment_summary = analyze_sentiment(headlines)
    state['stock_sentiment'] = {'headlines': headlines, 'news_sentiment': sentiment_summary}
    return state


def bull_handler(state: AgentState) -> AgentState:
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
    text = safe_llm_invoke(prompt)
    state['bull_analysis'] = text
    return state


def bear_handler(state: AgentState) -> AgentState:
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
    text = safe_llm_invoke(prompt)
    state['bear_analysis'] = text
    return state


def stock_handler(state: AgentState) -> AgentState:
    bull = state.get('bull_analysis', 'No bullish analysis available')
    bear = state.get('bear_analysis', 'No bearish analysis available')
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
    text = safe_llm_invoke(prompt)
    state['answer'] = text
    return state

# --- LangGraph build_graph kept (we will not rely on graph.invoke but keep for completeness) ---

def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("clarifier", clarifier_node)

    workflow.add_node("stock_sentiment", stock_sentiment)
    workflow.add_node("stock_handler", stock_handler)
    workflow.add_node("bull_handler", bull_handler)
    workflow.add_node("bear_handler", bear_handler)
    workflow.add_node("symbol_extractor", symbol_extractor)

    workflow.add_node("mf_handler", mf_handler)
    workflow.add_node("general_finance_handler", general_finance_handler)

    workflow.set_entry_point("classifier")

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

    return workflow

# --- Streamlit integration (Option 1: show pretty thinking blocks for each node) ---

from typing import Union

def pretty_append(node_name: str, data: Union[dict, str]):
    if 'thinking_steps' not in st.session_state:
        st.session_state.thinking_steps = []
    # Format data prettily
    if isinstance(data, dict):
        body = ''
        for k, v in data.items():
            body += f"- {k}: {v}\n"
    else:
        body = str(data)
    st.session_state.thinking_steps.append({"title": node_name, "content": body})


def run_langgraph_like(state: AgentState) -> AgentState:
    # We'll execute nodes in the same order as your graph and collect outputs
    # 1. Classifier
    state = classifier_node(state)
    pretty_append('Classifier', {"category": state['category'], "confidence": state['confidence'], "missing_info": state['missing_info'], "reasoning": state['reasoning']})

    # 2. Clarifier decision
    if state['missing_info'] and not state['clarification_used']:
        # stop and signal UI to ask clarifier
        pretty_append('Clarifier', {"missing_info": state['missing_info']})
        return state

    # Route
    if state['category'] == 'mf':
        state = mf_handler(state)
        pretty_append('MF Handler', state.get('answer', ''))
        return state
    if state['category'] == 'general_finance':
        state = general_finance_handler(state)
        pretty_append('General Finance Handler', state.get('answer', ''))
        return state
    if state['category'] == 'stock':
        state = symbol_extractor(state)
        pretty_append('Symbol Extractor', {"symbol": state.get('symbol'), "missing_info": state.get('missing_info')})
        if state.get('missing_info'):
            return state
        state = stock_sentiment(state)
        pretty_append('News & Sentiment', state.get('stock_sentiment', {}))
        state = bull_handler(state)
        pretty_append('Bullish Analysis', state.get('bull_analysis', ''))
        state = bear_handler(state)
        pretty_append('Bearish Analysis', state.get('bear_analysis', ''))
        state = stock_handler(state)
        pretty_append('Final Recommendation', state.get('answer', ''))
        return state

    # fallback
    state['answer'] = "Unable to process request"
    pretty_append('Final', state['answer'])
    return state

# --- Streamlit UI ---

def chat_message(role, content):
    align = 'flex-start' if role == 'user' else 'flex-end'
    bg = 'var(--chat-user-bg)' if role == 'user' else 'var(--chat-assistant-bg)'
    label = 'You' if role == 'user' else 'Assistant'

    html = f"""
    <div style='display:flex; justify-content:{align}; margin:8px 0;'>
        <div class="chat-bubble" style='background:{bg};'>
            <small style='opacity:0.6'>{label}</small><br/>
            {content}
        </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def main():
    st.set_page_config(page_title="Finance Assistant — Integrated LangGraph", layout="wide")
    # --- Dark/Light Mode Safe Styling ---
    st.markdown("""
    <style>
    /* Streamlit auto D/L mode colors */
    :root {
        --chat-user-bg: rgba(75, 192, 120, 0.18);     /* greenish bubble */
        --chat-assistant-bg: rgba(98, 132, 255, 0.18); /* bluish bubble */
        --bubble-text: var(--text-color, #FFFFFF);
    }

    /* In light mode, override text color */
    @media (prefers-color-scheme: light) {
        :root {
            --bubble-text: #000000;
        }
    }

    /* Chat bubble styling */
    .chat-bubble {
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 78%;
        color: var(--bubble-text);
        white-space: pre-wrap;
        font-size: 15px;
        line-height: 1.45;
    }

    /* Thinking blocks */
    .think-block {
        border-left: 4px solid #4A90E2;
        padding: 12px;
        border-radius: 6px;
        margin: 8px;
        max-width: 98%;
        background: rgba(100, 150, 255, 0.08);
        color: var(--bubble-text);
    }
    </style>
    """, unsafe_allow_html=True)

    st.title("💬 Finance Assistant — Full LangGraph Integration")

    if 'chat' not in st.session_state:
        st.session_state.chat = []
    if 'thinking_steps' not in st.session_state:
        st.session_state.thinking_steps = []
    if 'pending_clarifier' not in st.session_state:
        st.session_state.pending_clarifier = None
    if 'last_question' not in st.session_state:
        st.session_state.last_question = None

    chat_col, think_col = st.columns([2, 1])

    with chat_col:
        st.subheader("Conversation")
        for item in st.session_state.chat:
            chat_message(item['role'], item['content'])

        user_input = st.text_area("Type your question…", height=120, key="user_input2")
        send = st.button("Send")

        # Clarifier quick input
        if st.session_state.pending_clarifier:
            st.warning(f"Clarifier needs: {st.session_state.pending_clarifier}")
            clarifier_input = st.text_input("Provide missing info here:", key="clarify_input2")
            provide_clarifier = st.button("Provide clarifier")
        else:
            clarifier_input = None
            provide_clarifier = False

        # Handle clarifier provided
        if provide_clarifier and clarifier_input and clarifier_input.strip():
            st.session_state.chat.append({"role": "user", "content": clarifier_input})
            # attach clarifier to last_question
            base = st.session_state.last_question or clarifier_input
            combined = base + ' | ' + clarifier_input
            st.session_state.pending_clarifier = None
            # run graph with combined
            st.session_state.thinking_steps = []
            initial_state: AgentState = {
                "question": combined,
                "category": "",
                "missing_info": None,
                "confidence": 0.0,
                "reasoning": "",
                "clarification_used": True,
                "answer": "",
            }
            state = run_langgraph_like(initial_state)
            st.session_state.chat.append({"role": "assistant", "content": state.get('answer', '')})
            st.rerun()

        if send and user_input and user_input.strip():
            st.session_state.chat.append({"role": "user", "content": user_input})
            st.session_state.last_question = user_input
            # reset thinking blocks
            st.session_state.thinking_steps = []
            st.session_state.pending_clarifier = None

            initial_state: AgentState = {
                "question": user_input,
                "category": "",
                "missing_info": None,
                "confidence": 0.0,
                "reasoning": "",
                "clarification_used": False,
                "answer": "",
            }

            try:
                state = run_langgraph_like(initial_state)
            except RuntimeError as e:
                # LLM not configured
                err = str(e)
                st.error(err)
                st.session_state.chat.append({"role": "assistant", "content": err})
                st.rerun()

            # If clarifier needed, set pending and show message
            if state.get('missing_info') and not state.get('clarification_used'):
                st.session_state.pending_clarifier = state.get('missing_info')
                st.session_state.chat.append({"role": "assistant", "content": "I need more information: " + str(state.get('missing_info'))})
                st.rerun()


            st.session_state.chat.append({"role": "assistant", "content": state.get('answer', '')})
            st.rerun()

    with think_col:
        st.subheader("🧠 Thinking Blocks")
        if not st.session_state.thinking_steps:
            st.info("Thinking steps will appear here when you send a question.")
        else:
            for step in st.session_state.thinking_steps:
                title = step.get('title', '')
                content = step.get('content', '')
                html = f"""
                <div style='display:flex; justify-content:flex-end;'>
                    <div class="think-block">
                    <strong style="font-size:14px">{title}</strong>
                    <div style="margin-top:6px;white-space:pre-wrap">{content}</div>
                    </div>
                </div>
                """
                st.markdown(html, unsafe_allow_html=True)

    st.markdown("---")

if __name__ == '__main__':
    main()
