import time
from growwapi import GrowwAPI
import os
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())
api_key =os.getenv("GROWW_API_KEY")
secret = os.getenv("GROWW_SECRET")
 
access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
groww = GrowwAPI(access_token)

def place_order(symbol, quantity, target_trigger_price,stop_trigger_price,net_position_qty):
    oco_response = groww.create_smart_order(
        smart_order_type=groww.SMART_ORDER_TYPE_OCO,
        reference_id="oco-ref-unique456",
        segment=groww.SEGMENT_CASH,
        trading_symbol=symbol,
        quantity=quantity,
        product_type=groww.PRODUCT_MIS,
        exchange=groww.EXCHANGE_NSE,
        duration=groww.VALIDITY_DAY,

        net_position_quantity=net_position_qty,
        transaction_type=groww.TRANSACTION_TYPE_SELL,
        target={
            "trigger_price": target_trigger_price,
            "order_type": groww.ORDER_TYPE_LIMIT,
            "price": "121.00"
        },
        stop_loss={
            "trigger_price": stop_trigger_price,
            "order_type": groww.ORDER_TYPE_STOP_LOSS_MARKET,
            "price": None
        }
    )
    return oco_response