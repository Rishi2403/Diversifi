from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
from asgiref.wsgi import WsgiToAsgi
import uuid
import threading
import time
import datetime
import concurrent.futures
import os

from trading_lang import build_graph, AgentState


flask_app = Flask(__name__)
CORS(flask_app, resources={r"/*": {"origins": "*"}})


graph = build_graph()
TASKS = {}
_market_cache: dict = {}


# =============================
# Swagger Configuration
# =============================


SWAGGER_URL = "/docs"
API_URL = "/swagger.json"


swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        "app_name": "Finance Agent API"
    }
)


flask_app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)






@flask_app.route("/swagger.json")
def swagger_spec():
    return jsonify({
        "openapi": "3.0.0",
        "info": {
            "title": "Finance Agent API",
            "version": "1.0.0"
        },
        "paths": {
            "/ask": {
                "post": {
                    "summary": "Ask a finance question",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "question": {"type": "string"}
                                    },
                                    "required": ["question"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Task created"
                        }
                    }
                }
            },
            "/get/{task_id}": {
                "get": {
                    "summary": "Get task status",
                    "parameters": [
                        {
                            "name": "task_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Task status"
                        },
                        "404": {
                            "description": "Task not found"
                        }
                    }
                }
            },
            "/clarify": {
                "post": {
                    "summary": "Send clarification answer",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "task_id": {"type": "string"},
                                        "answer": {"type": "string"}
                                    },
                                    "required": ["task_id", "answer"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Clarification accepted"
                        },
                        "404": {
                            "description": "Task not found"
                        }
                    }
                }
            }
        }
    })






# -----------------------------
# Helpers
# -----------------------------


def run_graph(task_id: str):
    state = TASKS[task_id]["state"]
    try:
        final_state = graph.invoke(state)
        final_state["status"] = "COMPLETED"
        TASKS[task_id]["state"] = final_state


    except Exception as e:
        if str(e) == "WAITING_FOR_CLARIFICATION":
            state["status"] = "WAITING"
            TASKS[task_id]["state"] = state
        else:
            state["status"] = "FAILED"
            state["events"].append({
                "type": "error",
                "message": str(e)
            })
            TASKS[task_id]["state"] = state




def start_background_task(task_id: str):
    thread = threading.Thread(target=run_graph, args=(task_id,))
    thread.daemon = True
    thread.start()




# -----------------------------
# Routes
# -----------------------------


@flask_app.route("/ask", methods=["POST"])
def ask_agent():
    data = request.get_json()
    if not data or "question" not in data:
        return jsonify({"success": False, "error": "Missing question"}), 400


    task_id = str(uuid.uuid4())


    initial_state: AgentState = {
        "question": data["question"],
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


    TASKS[task_id] = {"state": initial_state}
    start_background_task(task_id)


    return jsonify({
        "task_id": task_id,
        "success": True
    })




@flask_app.route("/get/<task_id>", methods=["GET"])
def get_task_status(task_id):
    if task_id not in TASKS:
        return jsonify({"error": "Task not found"}), 404


    state = TASKS[task_id]["state"]
    return jsonify({
        "status": state["status"],
        "events": state["events"],
        "answer": state.get("answer"),
        "missing_info": state.get("missing_info")
    })




@flask_app.route("/clarify", methods=["POST"])
def send_clarifier():
    data = request.get_json()
    if not data or "task_id" not in data or "answer" not in data:
        return jsonify({"success": False, "error": "Invalid request"}), 400


    task_id = data["task_id"]
    answer = data["answer"]


    task = TASKS.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404


    state = task["state"]
    state["question"] = state["question"] + " | " + answer
    state["clarification_used"] = True
    state["status"] = "RUNNING"


    TASKS[task_id]["state"] = state
    start_background_task(task_id)


    return jsonify({"success": True})




# -----------------------------
# Portfolio Routes
# -----------------------------


@flask_app.route("/portfolio/groww/holdings", methods=["GET"])
def groww_holdings():
    from portfolio_service import fetch_groww_holdings
    return jsonify(fetch_groww_holdings())




@flask_app.route("/portfolio/groww/mf", methods=["GET"])
def groww_mf():
    from portfolio_service import fetch_groww_mf
    return jsonify(fetch_groww_mf())




@flask_app.route("/portfolio/price/<symbol>", methods=["GET"])
def stock_price(symbol):
    from portfolio_service import fetch_live_price
    return jsonify(fetch_live_price(symbol))




@flask_app.route("/portfolio/prices", methods=["POST"])
def bulk_prices():
    from portfolio_service import fetch_bulk_prices
    data = request.get_json()
    symbols = data.get("symbols", []) if data else []
    if not symbols:
        return jsonify({"success": False, "error": "No symbols provided"}), 400
    return jsonify(fetch_bulk_prices(symbols))




@flask_app.route("/api/portfolio/deep-analyse", methods=["POST"])
def portfolio_deep_analyse():
    from portfolio_analysis import compute_portfolio_metrics
    data = request.get_json() or {}
    try:
        result = compute_portfolio_metrics(
            stocks=data.get("stocks", []),
            mutual_funds=data.get("mutualFunds", []),
            benchmark=data.get("benchmark", "nifty50"),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500




# -----------------------------
# Global Markets Routes
# -----------------------------


@flask_app.route("/global/market-data", methods=["GET"])
def global_market_data():
    from global_market_service import fetch_global_market_data
    return jsonify(fetch_global_market_data())




@flask_app.route("/global/fii-dii", methods=["GET"])
def fii_dii_data():
    from global_market_service import fetch_fii_dii
    return jsonify(fetch_fii_dii())




# -----------------------------
# Research Routes
# -----------------------------

@flask_app.route("/api/research/pulse", methods=["GET"])
def research_pulse():
    from research_service import get_pulse_data
    try:
        return jsonify(get_pulse_data())
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@flask_app.route("/api/research/analyse", methods=["POST"])
def research_analyse():
    from research_service import analyse_stock
    data   = request.get_json() or {}
    symbol = data.get("symbol", "").strip()
    if not symbol:
        return jsonify({"success": False, "error": "No symbol provided"}), 400
    return jsonify(analyse_stock(symbol))


@flask_app.route("/api/research/suggest", methods=["POST"])
def research_suggest():
    from research_service import suggest_stocks
    data = request.get_json() or {}
    try:
        result = suggest_stocks(
            amount          = int(data.get("amount", 50000)),
            horizon         = data.get("horizon", "Medium"),
            risk            = data.get("risk", "Moderate"),
            sector          = data.get("sector"),
            investment_type = data.get("investment_type", "lumpsum"),
            duration_years  = int(data.get("duration_years", 0)),
        )
        return jsonify({"success": True, "suggestions": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



@flask_app.route("/api/research/mf/pulse", methods=["GET"])
def research_mf_pulse():
    from mf_service import get_mf_pulse_data
    return jsonify(get_mf_pulse_data())


@flask_app.route("/api/research/mf/analyse", methods=["POST"])
def research_mf_analyse():
    from mf_service import analyse_mf
    data  = request.get_json() or {}
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"success": False, "error": "No query provided"}), 400
    return jsonify(analyse_mf(query))


@flask_app.route("/api/research/mf/suggest", methods=["POST"])
def research_mf_suggest():
    from mf_service import suggest_mfs
    data = request.get_json() or {}
    try:
        result = suggest_mfs(
            amount          = int(data.get("amount", 50000)),
            horizon         = data.get("horizon", "Medium"),
            risk            = data.get("risk", "Moderate"),
            category        = data.get("category"),
            investment_type = data.get("investment_type", "lumpsum"),
            duration_years  = int(data.get("duration_years", 0)),
        )
        return jsonify({"success": True, "suggestions": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -----------------------------
# Markets Route
# -----------------------------

_INDICES = [
    {"symbol": "^NSEI",      "name": "Nifty 50",        "region": "India", "flag": "🇮🇳"},
    {"symbol": "^BSESN",     "name": "Sensex",          "region": "India", "flag": "🇮🇳"},
    {"symbol": "^NSEBANK",   "name": "Bank Nifty",      "region": "India", "flag": "🇮🇳"},
    {"symbol": "^CNXIT",     "name": "Nifty IT",        "region": "India", "flag": "🇮🇳"},
    {"symbol": "^CNXPHARMA", "name": "Nifty Pharma",    "region": "India", "flag": "🇮🇳"},
    {"symbol": "^CNXAUTO",   "name": "Nifty Auto",      "region": "India", "flag": "🇮🇳"},
    {"symbol": "^NSEMDCP50", "name": "Nifty Midcap 50", "region": "India", "flag": "🇮🇳"},
    {"symbol": "^GSPC",      "name": "S&P 500",         "region": "USA",   "flag": "🇺🇸"},
    {"symbol": "^IXIC",      "name": "NASDAQ",          "region": "USA",   "flag": "🇺🇸"},
    {"symbol": "^DJI",       "name": "Dow Jones",       "region": "USA",   "flag": "🇺🇸"},
    {"symbol": "^FTSE",      "name": "FTSE 100",        "region": "UK",    "flag": "🇬🇧"},
    {"symbol": "^N225",      "name": "Nikkei 225",      "region": "Japan", "flag": "🇯🇵"},
]

_COMMODITIES = [
    {"symbol": "GC=F", "name": "Gold",          "unit": "USD/oz"},
    {"symbol": "SI=F", "name": "Silver",         "unit": "USD/oz"},
    {"symbol": "CL=F", "name": "WTI Crude Oil", "unit": "USD/bbl"},
    {"symbol": "BZ=F", "name": "Brent Crude",   "unit": "USD/bbl"},
    {"symbol": "NG=F", "name": "Natural Gas",   "unit": "USD/MMBtu"},
]


def _fetch_one(item: dict) -> dict:
    import yfinance as yf
    sym = item["symbol"]
    try:
        t = yf.Ticker(sym)
        fi = t.fast_info
        price = fi.last_price
        prev  = fi.previous_close
        if not price or not prev:
            hist = t.history(period="5d", interval="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                prev  = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price
        price = price or 0.0
        prev  = prev  or price
        change     = price - prev
        change_pct = (change / prev * 100) if prev else 0.0
        return {**item, "price": round(price, 2), "change": round(change, 2), "changePct": round(change_pct, 2)}
    except Exception as e:
        return {**item, "price": 0.0, "change": 0.0, "changePct": 0.0, "error": str(e)}


@flask_app.route("/api/markets", methods=["GET"])
def market_data():
    global _market_cache
    now = time.time()
    if _market_cache.get("data") and (now - _market_cache.get("ts", 0)) < 300:
        return jsonify(_market_cache["data"])

    all_items = _INDICES + _COMMODITIES
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        results = list(ex.map(_fetch_one, all_items))

    n = len(_INDICES)
    payload = {
        "success":    True,
        "indices":    results[:n],
        "commodities": results[n:],
        "timestamp":  datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    _market_cache["data"] = payload
    _market_cache["ts"]   = now
    return jsonify(payload)


# -----------------------------
# Agent Routes
# -----------------------------

@flask_app.route("/api/agent/status", methods=["GET"])
def agent_status():
    from agent_service import get_agent_status
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"status": "error", "detail": "email param required"}), 400
    return jsonify(get_agent_status(email))


@flask_app.route("/api/agent/onboard", methods=["POST"])
def agent_onboard():
    from agent_service import onboard_user
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    holdings = data.get("holdings", {})
    profile  = data.get("profile", {})
    if not email:
        return jsonify({"success": False, "error": "email required"}), 400
    return jsonify(onboard_user(email, holdings, profile))


@flask_app.route("/api/agent/dashboard", methods=["GET"])
def agent_dashboard():
    from agent_service import get_dashboard
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"success": False, "error": "email required"}), 400
    return jsonify(get_dashboard(email))


@flask_app.route("/api/agent/stream", methods=["GET"])
def agent_stream():
    from flask import Response, stream_with_context
    from agent_service import subscribe_sse, unsubscribe_sse
    import json as _json

    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "email required"}), 400

    q = subscribe_sse(email)

    def event_stream():
        # heartbeat first
        yield "data: {\"type\":\"connected\"}\n\n"
        try:
            while True:
                try:
                    event = q.get(timeout=25)
                    yield f"data: {_json.dumps(event)}\n\n"
                except Exception:
                    # send keepalive ping
                    yield "data: {\"type\":\"ping\"}\n\n"
        except GeneratorExit:
            pass
        finally:
            unsubscribe_sse(email, q)

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@flask_app.route("/api/agent/analyse", methods=["POST"])
def agent_analyse():
    from agent_service import trigger_analyse
    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "error": "email required"}), 400
    return jsonify(trigger_analyse(email))


@flask_app.route("/api/agent/report/send", methods=["POST"])
def agent_report_send():
    from agent_service import get_dashboard, _load_index, _load_user
    from agent_email import send_report
    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "error": "email required"}), 400
    try:
        index = _load_index()
        if email not in index or not index[email].get("isDataPresent"):
            return jsonify({"success": False, "error": "not onboarded"}), 400
        user = _load_user(index[email]["dataFile"])
        if not user:
            return jsonify({"success": False, "error": "user data missing"}), 404
        send_report(email, user)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@flask_app.route("/api/agent/chat", methods=["POST"])
def agent_chat():
    from agent_service import extract_profile_with_llm
    data       = request.get_json() or {}
    transcript = data.get("transcript", "")
    if not transcript:
        return jsonify({"success": False, "error": "transcript required"}), 400
    profile = extract_profile_with_llm(transcript)
    return jsonify({"success": True, "profile": profile})


@flask_app.route("/api/agent/history", methods=["GET"])
def agent_price_history():
    """Returns 30-day daily close prices for a given NSE stock symbol."""
    symbol = request.args.get("symbol", "").strip().upper()
    if not symbol:
        return jsonify({"success": False, "error": "symbol required"}), 400
    try:
        import yfinance as yf
        ns   = symbol + ".NS"
        hist = yf.Ticker(ns).history(period="1mo", interval="1d")
        if hist.empty:
            return jsonify({"success": False, "error": "no data"}), 404
        data = [
            {"date": str(idx.date()), "close": round(float(row["Close"]), 2)}
            for idx, row in hist.iterrows()
        ]
        return jsonify({"success": True, "symbol": symbol, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@flask_app.route("/api/chat", methods=["POST"])
def investment_chat():
    import json as _json
    from flask import stream_with_context, Response as FlaskResponse

    data         = request.get_json() or {}
    messages     = data.get("messages", [])
    context_text = data.get("context", "")

    if not messages:
        return jsonify({"error": "messages required"}), 400

    api_key  = os.getenv("ANTHROPIC_API_KEY", "")
    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")

    system_lines = [
        "You are an expert AI investment advisor specializing in Indian equity markets (NSE/BSE), mutual funds, bonds, ETFs, SIPs/SWPs, portfolio management and global financial markets.",
        "",
        "STRICT RULES:",
        "1. ONLY answer questions about: stocks, mutual funds, bonds, portfolio analysis, asset allocation, financial planning, market trends, company fundamentals, technical analysis, IPOs, SIPs, SWPs, LTCG/STCG tax, economic indicators and financial instruments.",
        "2. For ANY off-topic question respond exactly: \"I'm your dedicated investment assistant. I can only help with investment and finance-related queries. What would you like to know about your portfolio or the markets?\"",
        "3. Always note that responses are educational analysis, not personalized financial advice.",
        "4. Use Indian market context when relevant - INR, SEBI regulations, NSE/BSE conventions, Indian tax rules (LTCG 12.5% above ₹1.25L, STCG 20%).",
        "5. Be concise and structured. Use bullet points for complex answers. Lead with the most actionable insight.",
    ]
    if context_text:
        system_lines += [
            "",
            "PORTFOLIO CONTEXT (use this for personalized, relevant answers):",
            context_text,
        ]

    system = "\n".join(system_lines)

    def generate():
        try:
            import anthropic as _anthropic
            client = (
                _anthropic.AnthropicFoundry(api_key=api_key, resource=resource)
                if resource else _anthropic.Anthropic(api_key=api_key)
            )
            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {_json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {_json.dumps({'error': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return FlaskResponse(
        stream_with_context(generate()),
        content_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@flask_app.route("/api/agent/reset", methods=["PUT"])
def agent_reset():
    from agent_service import reset_user
    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "error": "email required"}), 400
    return jsonify(reset_user(email))


# -----------------------------
# Entry Point
# -----------------------------

# Start autonomous agent loop
from agent_service import start_agent_loop
start_agent_loop()

# Wrap Flask app with ASGI adapter for uvicorn
app = WsgiToAsgi(flask_app)


if __name__ == "__main__":
    flask_app.run(host="0.0.0.0", port=8000, debug=True)

