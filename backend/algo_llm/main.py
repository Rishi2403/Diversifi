from groww_data import fetch_live_data
import json

NIFTY_50 = [
    "RELIANCE"
]
resp = {}
for i in NIFTY_50:
    resp = fetch_live_data(i)

    print(resp, type(resp))


print(resp['upper_circuit_limit'])