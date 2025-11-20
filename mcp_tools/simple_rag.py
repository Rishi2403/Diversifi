
# This file is for trying out will not be used
import asyncio
from fastmcp import Client
from fastmcp.client.transports import PythonStdioTransport
from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
import sys

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())



class NewsTool:
    def __init__(self):
        self.transport = PythonStdioTransport(
           "mcp_tools/mcp_server.py"
        )
        self.client = Client(transport=self.transport)

    async def fetch(self, symbol, limit=3):
        async with self.client:
            result = await self.client.call_tool(
                "fetch_news",
                {"symbol": symbol, "limit": limit}
            )
            return result.structured_content["result"]



async def retrieve_news(symbol: str):
    tool = NewsTool()
    news = await tool.fetch(symbol)

    docs = []
    for item in news:
        docs.append(
            Document(
                page_content=item["title"],
                metadata={"source": item["source"], "symbol": symbol}
            )
        )
    return docs


async def rag_answer(symbol: str):
    docs = await retrieve_news(symbol)
    news_text = "\n".join([d.page_content for d in docs])

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        groq_api_key="xxx"
    )

    prompt = ChatPromptTemplate.from_template(
    """
        You're an AI financial analysis assistant.

        User Query: {symbol}

        Relevant News:
        {text}

        Give a concise and accurate response based ONLY on the news.
    """
    )

    chain = prompt | llm

    result = await chain.ainvoke({
        "symbol": symbol,
        "text": news_text
    })
    return result.content



if __name__ == "__main__":
    symbol = "AAPL"
    print("\n🔍 Fetching + Analyzing News via MCP + LangChain + Groq...\n")

    answer = asyncio.run(rag_answer(symbol))
    print("\n📌 Final RAG Answer:\n")
    print(answer)
