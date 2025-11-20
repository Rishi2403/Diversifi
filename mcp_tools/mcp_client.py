import asyncio
from fastmcp import Client
from fastmcp.client.transports import PythonStdioTransport

async def main():

    transport = PythonStdioTransport("mcp_tools/mcp_server.py")

    client = Client(transport=transport)

    async with client:
        await client.ping()
        result = await client.call_tool(
            "fetch_news",
            {"symbol": "AAPL", "limit": 3}
        )
        print("News Response:", result)
    
    await client.close()
    transport.close()

if __name__ == "__main__":
    asyncio.run(main())
