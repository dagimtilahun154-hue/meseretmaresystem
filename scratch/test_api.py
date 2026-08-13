import requests
import json

payload = {
    "latitude": 9.0,
    "longitude": 38.75,
    "vertical_lift_m": 45.0,
    "pipe_length_m": 60.0,
    "pipe_diameter_inch": 1.25,
    "daily_water_need_m3": 20.0
}

try:
    r = requests.post("http://localhost:8000/api/recommend-pump", json=payload)
    print("STATUS:", r.status_code)
    print("RESPONSE:", json.dumps(r.json(), indent=2)[:2000])
except Exception as e:
    print("ERROR:", e)
