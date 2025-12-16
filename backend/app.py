from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
import uuid
import threading

from trading_lang import build_graph, AgentState

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

graph = build_graph()
TASKS = {}

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

app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)



@app.route("/swagger.json")
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

@app.route("/ask", methods=["POST"])
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


@app.route("/get/<task_id>", methods=["GET"])
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


@app.route("/clarify", methods=["POST"])
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
# Entry Point
# -----------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
