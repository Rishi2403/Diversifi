import streamlit as st
import requests
import pandas as pd

# Your FastAPI backend URL
API_BASE = "http://localhost:8000"

# ----------------------------------------------------
# PAGE CONFIG
# ----------------------------------------------------
st.set_page_config(
    page_title="Stock News Sentiment Dashboard",
    page_icon="📈",
    layout="wide"
)

# ----------------------------------------------------
# CUSTOM DARK THEME CSS
# ----------------------------------------------------
dark_css = """
<style>

html, body, [class*="css"] {
    background-color: #0e1117 !important;
    color: #e0e0e0 !important;
}

h1, h2, h3, h4 {
    color: #ffffff !important;
}

[data-testid="stSidebar"] {
    background-color: #11141c !important;
}

.card {
    background: rgba(255,255,255,0.05);
    padding: 18px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 12px;
}

.positive-badge { color: #00ff88; font-weight: 700; }
.negative-badge { color: #ff4f4f; font-weight: 700; }
.neutral-badge  { color: #bdbdbd; font-weight: 700; }

</style>
"""
st.markdown(dark_css, unsafe_allow_html=True)


# ----------------------------------------------------
# SIDEBAR NAVIGATION
# ----------------------------------------------------
st.sidebar.title("📊 Dashboard")
menu = st.sidebar.radio(
    "Navigate",
    ["Home", "News Sentiment", "Database Records", "API Health"]
)

st.sidebar.markdown("---")
st.sidebar.write("Made by **Rishi** 🚀")

# ----------------------------------------------------
# HOME PAGE
# ----------------------------------------------------
if menu == "Home":
    st.title("🌙 Stock News Sentiment Dashboard")
    st.markdown("""
    This dashboard connects to your FastAPI backend and gives you:

    - 📰 Real-time stock news  
    - 🔍 Sentiment analysis  
    - 🗄 Stored database results  
    - 💡 API health status  

    Use the left sidebar to navigate.
    """)

# ----------------------------------------------------
# NEWS SENTIMENT PAGE
# ----------------------------------------------------
elif menu == "News Sentiment":
    st.title("📰 Stock News Sentiment Analysis")

    symbol = st.text_input("Enter Stock Symbol (AAPL, TSLA, INFY, TCS):", "")

    if st.button("Analyze News"):
        if symbol.strip() == "":
            st.error("⚠️ Stock symbol cannot be empty.")
        else:
            with st.spinner("Fetching news & analyzing sentiment..."):
                try:
                    response = requests.post(
                        f"{API_BASE}/news-sentiment",
                        json={"symbol": symbol}
                    )

                    if response.status_code == 200:
                        data = response.json()

                        st.success(f"Results for **{data['symbol']}** — {data['timestamp']}")

                        headlines = data["headlines"]
                        df = pd.DataFrame(headlines)

                        # Display each headline
                        st.subheader("🔎 Headlines & Sentiments")
                        for item in headlines:
                            sentiment = item["sentiment"].lower()

                            badge_class = {
                                "positive": "positive-badge",
                                "negative": "negative-badge",
                                "neutral": "neutral-badge"
                            }.get(sentiment, "neutral-badge")

                            st.markdown(
                                f"""
                                <div class="card">
                                    <strong>{item['title']}</strong><br>
                                    Sentiment: <span class="{badge_class}">{item['sentiment']}</span>
                                </div>
                                """,
                                unsafe_allow_html=True
                            )

                        # Chart
                        st.subheader("📊 Sentiment Distribution")
                        st.bar_chart(df["sentiment"].value_counts())

                    else:
                        st.error(f"❌ API Error: {response.json().get('detail')}")

                except Exception as e:
                    st.error(f"❌ Request failed: {e}")

# ----------------------------------------------------
# DATABASE PAGE
# ----------------------------------------------------
elif menu == "Database Records":
    st.title("🗄 Stored News Records")

    if st.button("Load Database Records"):
        try:
            res = requests.get(f"{API_BASE}/database")

            if res.status_code == 200:
                content = res.json()

                st.info(f"Total Records: {content['total_records']}")

                for record in content["records"]:
                    with st.expander(f"{record['symbol']} — {record['timestamp']}"):
                        st.json(record)

            else:
                st.error(res.json().get("detail"))

        except Exception as e:
            st.error(f"⚠️ Failed to load database: {e}")

# ----------------------------------------------------
# API HEALTH PAGE
# ----------------------------------------------------
elif menu == "API Health":
    st.title("💡 API Health Status")

    if st.button("Check Status"):
        try:
            res = requests.get(f"{API_BASE}/health")
            if res.status_code == 200:
                st.success(res.json())
            else:
                st.error("❌ API returned an error.")
        except Exception as e:
            st.error(f"⚠️ Could not reach API: {e}")
