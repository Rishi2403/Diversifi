from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uuid
# from fastapi.middleware.cors import CORSMiddleware
import time

from trading_lang import build_graph, AgentState

app = FastAPI(title="Finance Agent API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://127.0.0.1:5173",
#         "http://localhost:3000",
#         "http://127.0.0.1:3000",
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

graph = build_graph()
TASKS = {}



class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    task_id: str
    success: bool

class ClarifierRequest(BaseModel):
    task_id: str
    answer: str  



@app.post("/ask", response_model=AskResponse)
def ask_agent(req: AskRequest, background: BackgroundTasks):
    task_id = str(uuid.uuid4())
    initial_state: AgentState = {
        "question": req.question,
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
    background.add_task(run_graph, task_id)
    return {"task_id": task_id, "success": True}


@app.get("/get/{task_id}")
def get_task_status(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    state = TASKS[task_id]["state"]
    return {
        "status": state["status"],
        "events": state["events"],
        "answer": state.get("answer"),
        "missing_info": state.get("missing_info")
    }



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


@app.post("/clarify")
def send_clarifier(req: ClarifierRequest, background: BackgroundTasks):
    task = TASKS.get(req.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    state = task["state"]

    state["question"] = state["question"] + " | " + req.answer
    state["clarification_used"] = True

    state["status"] = "RUNNING"
    TASKS[req.task_id]["state"] = state


    background.add_task(run_graph, req.task_id)
    return {"success": True}