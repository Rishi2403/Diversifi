from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
from asgiref.wsgi import WsgiToAsgi
import uuid
import threading
import time
import datetime
import concurrent.futures


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
# Markets Route
# -----------------------------

_INDICES = [
    {"symbol": "^NSEI",     "name": "Nifty 50",      "region": "India",     "flag": "🇮🇳"},
    {"symbol": "^BSESN",    "name": "Sensex",         "region": "India",     "flag": "🇮🇳"},
    {"symbol": "^GSPC",     "name": "S&P 500",        "region": "USA",       "flag": "🇺🇸"},
    {"symbol": "^IXIC",     "name": "NASDAQ",         "region": "USA",       "flag": "🇺🇸"},
    {"symbol": "^DJI",      "name": "Dow Jones",      "region": "USA",       "flag": "🇺🇸"},
    {"symbol": "^FTSE",     "name": "FTSE 100",       "region": "UK",        "flag": "🇬🇧"},
    {"symbol": "^GDAXI",    "name": "DAX",            "region": "Germany",   "flag": "🇩🇪"},
    {"symbol": "^N225",     "name": "Nikkei 225",     "region": "Japan",     "flag": "🇯🇵"},
    {"symbol": "^HSI",      "name": "Hang Seng",      "region": "Hong Kong", "flag": "🇭🇰"},
    {"symbol": "000001.SS", "name": "Shanghai Comp.", "region": "China",     "flag": "🇨🇳"},
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
        "timestamp":  datetime.datetime.utcnow().isoformat() + "Z",
    }
    _market_cache["data"] = payload
    _market_cache["ts"]   = now
    return jsonify(payload)


# -----------------------------
# Entry Point
# -----------------------------


# Wrap Flask app with ASGI adapter for uvicorn
app = WsgiToAsgi(flask_app)


if __name__ == "__main__":
    flask_app.run(host="0.0.0.0", port=8000, debug=True)

