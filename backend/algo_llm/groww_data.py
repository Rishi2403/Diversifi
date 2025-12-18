import os
from dotenv import find_dotenv, load_dotenv
from growwapi import GrowwAPI,GrowwFeed
import time

load_dotenv(find_dotenv())
api_key =os.getenv("GROWW_API_KEY")
secret = os.getenv("GROWW_SECRET")
 
access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
groww = GrowwAPI(access_token)


def fetch_live_data(symbol):
    data_response = groww.get_quote(
    exchange=groww.EXCHANGE_NSE,
    segment=groww.SEGMENT_CASH,
        trading_symbol=symbol
    )
    return data_response