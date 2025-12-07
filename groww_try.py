import os
from dotenv import find_dotenv, load_dotenv
from growwapi import GrowwAPI,GrowwFeed
import time

load_dotenv(find_dotenv())
api_key =os.getenv("GROWW_API_KEY")
secret = os.getenv("GROWW_SECRET")
 
access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
groww = GrowwAPI(access_token)

# holdings_response = groww.get_holdings_for_user(timeout=5)
# print(holdings_response)

groww = GrowwAPI(access_token)
 
place_order_response = groww.place_order(
    trading_symbol="IREDA",
    quantity=1, 
    validity=groww.VALIDITY_DAY,
    exchange=groww.EXCHANGE_NSE,
    segment=groww.SEGMENT_CASH,
    product=groww.PRODUCT_CNC,
    order_type=groww.ORDER_TYPE_MARKET, # You can also use ORDER_TYPE_MARKET, ORDER_TYPE_STOP_LOSS, ORDER_TYPE_STOP_LOSS_MARKET for 
    transaction_type=groww.TRANSACTION_TYPE_SELL,
    # price=250,               # Optional: Price of the stock (for Limit orders)
    # trigger_price=245,       # Optional: Trigger price (if applicable)
    # order_reference_id="Ab-654321234-1628190"  # Optional: User provided 8 to 20 length alphanumeric reference ID to track the order
)
print(place_order_response)



# quote_response = groww.get_quote(
#     exchange=groww.EXCHANGE_NSE,
#     segment=groww.SEGMENT_CASH,
#     trading_symbol="NIFTY"
# )
# print(quote_response)


end_time_in_millis = int(time.time() * 1000) # epoch time in milliseconds
start_time_in_millis = end_time_in_millis - (24 * 60 * 60 * 1000) # last 24 hours
 
# OR
 
# end_time = "2025-02-27 14:00:00"
# start_time = "2025-02-27 10:00:00"
 
# historical_data_response = groww.get_historical_candle_data(
#     trading_symbol="RELIANCE",
#     exchange=groww.EXCHANGE_NSE,
#     segment=groww.SEGMENT_CASH,
#     start_time=start_time,
#     end_time=end_time,
#     interval_in_minutes=5 # Optional: Interval in minutes for the candle data
# )
# print(historical_data_response)


# feed = GrowwFeed(groww)
 
# def on_data_received(meta): # callback function which gets triggered when data is received
#     print("Data received")
#     print(feed.get_ltp())
 
# # you can fetch exchange_token from instruments.csv file
# instruments_list = [{"exchange": "NSE", "segment": "CASH", "exchange_token": "2885"}, {"exchange": "NSE", "segment": "FNO", "exchange_token": "35241"}]
 
# feed.subscribe_ltp(instruments_list, on_data_received=on_data_received)
 
#  # This is a blocking call. Nothing after this will run.
# feed.consume()
 
# # OR
 
# # you can also fetch data synchronously
# feed.subscribe_ltp(instruments_list)
 
# # live data can also be continuously polled using this method
# for i in range(10):
#   time.sleep(3)
#   print(feed.get_ltp())
 
# feed.unsubscribe_ltp(instruments_list)