import os
import sys
from typing import Annotated, Literal
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate
from news_service import NewsService
from dotenv import load_dotenv, find_dotenv


load_dotenv(find_dotenv())

google_api_key = os.getenv("GOOGLE_API_KEY")

if not google_api_key:
    print("Error: GOOGLE_API_KEY not found.")
    sys.exit(1)

news_service = NewsService()


@tool
def fetch_stock_news_tool(symbol: str, limit: int = 3):
    """
    Fetch the latest news for a specific stock symbol. 
    Use this tool ONLY when the user asks for news about a specific company stock.
    """
    try:
        return news_service.fetch_stock_news(symbol, limit)
    except Exception as e:
        return f"Error: {str(e)}"



llm = ChatGoogleGenerativeAI(
    api_key=google_api_key,
    model="gemini-2.5-flash",    
    temperature=0
)

tools = [fetch_stock_news_tool]

prompt_template = ChatPromptTemplate.from_messages([
    ("system", 
     "You are a helpful assistant. You have access to fetch_stock_news_tool tool. "
     "If the user asks a question that can be answered with general knowledge, "
     "ANSWER DIRECTLY. Do not attempt to use tools that are not provided. "
     "if user asks about a specific company without their stock symbol first determine the stock symbol using internal knowledge and then use the fetch_stock_news_tool ONLY for stock-specific news queries. You will aslo determine the sentiment if asked based on your knowledge"
    ),
    ("placeholder", "{messages}")
])

agent = create_react_agent(llm, tools=tools, prompt=prompt_template)



def run_query(user_query: str):
    print(f"\n--- User: {user_query} ---")
    inputs = {"messages": [("user", user_query)]}

    try:
        final_response = None

        for chunk in agent.stream(inputs, stream_mode="values"):
            message = chunk["messages"][-1]

            # Show tool calls
            if hasattr(message, 'tool_calls') and message.tool_calls:
                for tc in message.tool_calls:
                    print(f"   (Calling Tool: {tc['name']})")

            else:
                final_response = message

        clean_output = ""

        if isinstance(final_response.content, list):
            for item in final_response.content:
                if isinstance(item, dict) and item.get("type") == "text":
                    clean_output += item.get("text", "") + "\n"

        elif isinstance(final_response.content, str):
            clean_output = final_response.content

        print("\nAgent:", clean_output.strip())

    except Exception as e:
        print(f"An error occurred: {e}")
   


if __name__ == "__main__":
    print("\nAgent is ready. Type your message below.")
    print("Type 'exit', 'quit', or 'stop' to end the chat.\n")

    while True:
        user_query = input("You: ").strip()

        if user_query.lower() in ["exit", "quit", "stop"]:
            print("\nExiting chat. Goodbye!")
            break

        run_query(user_query)
