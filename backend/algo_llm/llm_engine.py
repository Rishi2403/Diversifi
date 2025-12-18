from openai import OpenAI
import json

client = OpenAI(api_key="YOUR_LLM_API_KEY")

SYSTEM_PROMPT = """
You are a conservative Indian equity trading assistant.
Goal: intraday / short-term swing trades.
Rules:
- Select at most 2 stocks
- Prefer high volume, clear momentum
- Avoid overtrading
- Capital is limited (₹5000)
Respond strictly in JSON.
"""

def llm_decide(market_snapshot):
    user_prompt = f"""
Market snapshot:
{json.dumps(market_snapshot, indent=2)}

Decide trades.
Format:
{{
  "trades": [
    {{
      "symbol": "",
      "action": "BUY | SELL | IGNORE",
      "confidence": 0.0,
      "reason": ""
    }}
  ]
}}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2
    )

    return json.loads(response.choices[0].message.content)
