import streamlit as st
import requests
import pandas as pd

API_BASE = "http://localhost:8000"  # your FastAPI backend

st.set_page_config(page_title="Stock News Sentiment Dashboard", layout="wide")

st.title("📈 Stock News Sentiment Dashboard")
st.write("Enter a stock symbol to fetch latest news and sentiment analysis")

# -------------------------
# Input Section
# -------------------------
symbol = st.text_input("Enter Stock Symbol (e.g., AAPL, TSLA, INFY)", "")

if st.button("Fetch News Sentiment"):
    if symbol.strip() == "":
        st.error("Symbol cannot be empty")
    else:
        with st.spinner("Fetching news and analyzing sentiment..."):
            try:
                resp = requests.post(f"{API_BASE}/news-sentiment", json={"symbol": symbol})
                
                if resp.status_code == 200:
                    data = resp.json()

                    st.success(f"News Sentiment for {data['symbol']} at {data['timestamp']}")

                    # Display Table
                    df = pd.DataFrame(data["headlines"])
                    st.dataframe(df, use_container_width=True)

                    # Sentiment Counts
                    sentiment_count = df['sentiment'].value_counts()
                    st.subheader("Sentiment Summary")
                    st.bar_chart(sentiment_count)

                else:
                    st.error(f"Error: {resp.json().get('detail')}")

            except Exception as e:
                st.error(f"Request failed: {e}")

st.markdown("---")

# -------------------------
# Database Section
# -------------------------
st.header("🗄 Stored News Records (Database View)")

if st.button("Load Database Records"):
    try:
        resp = requests.get(f"{API_BASE}/database")
        if resp.status_code == 200:
            db_data = resp.json()

            st.write(f"Total Records: {db_data['total_records']}")

            # Expandable list
            for record in db_data["records"]:
                with st.expander(f"{record['symbol']} — {record['timestamp']}"):
                    st.json(record)

        else:
            st.error(f"Error: {resp.json().get('detail')}")
    except Exception as e:
        st.error(f"Failed to load database: {e}")

st.markdown("---")

# -------------------------
# Health Check
# -------------------------
st.header("💡 API Health Check")

if st.button("Check API Health"):
    try:
        resp = requests.get(f"{API_BASE}/health")
        if resp.status_code == 200:
            st.success(resp.json())
        else:
            st.error(f"API Error: {resp.json().get('detail')}")
    except Exception as e:
        st.error(f"Health check failed: {e}")


