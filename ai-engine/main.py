import os
import json
import logging
import math
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="SolarFlow Pump Sizing AI Engine")

# Setup CORS to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
client = None
if not api_key or api_key == "your_groq_api_key_here":
    logging.warning("GROQ_API_KEY is missing or not configured in .env")
else:
    try:
        client = Groq(api_key=api_key)
        logging.info("Groq client initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize Groq client: {e}")

# Request Model
class PumpSizingRequest(BaseModel):
    latitude: float
    longitude: float
    vertical_lift_m: float
    pipe_length_m: float
    pipe_diameter_inch: float
    daily_water_need_m3: Optional[float] = 20.0
    custom_insolation: Optional[List[float]] = None
    custom_temp: Optional[List[float]] = None

class PumpResponse(BaseModel):
    exact_match: dict
    alternatives: List[dict]
    calculated_tdh: float

def fetch_nasa_climatology(lat: float, lng: float) -> dict:
    url = f"https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,TS&community=RE&longitude={lng}&latitude={lat}&format=json"
    fallback_insolation = [5.5, 5.7, 6.0, 5.8, 5.5, 5.0, 4.5, 4.8, 5.2, 5.5, 5.4, 5.3]
    fallback_temp = [20.0, 21.0, 22.0, 22.0, 21.0, 20.0, 19.0, 19.0, 20.0, 21.0, 21.0, 20.0]
    
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            parameter = data.get("properties", {}).get("parameter", {})
            insolation_dict = parameter.get("ALLSKY_SFC_SW_DWN", {})
            temp_dict = parameter.get("TS", {})
            
            months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
            insolation = [insolation_dict.get(m, fallback_insolation[i]) for i, m in enumerate(months)]
            temperature = [temp_dict.get(m, fallback_temp[i]) for i, m in enumerate(months)]
            
            return {
                "sol_insolation": insolation,
                "temperature": temperature
            }
    except Exception as e:
        logging.error(f"Failed to fetch NASA climatology, using fallbacks: {e}")
        
    return {
        "sol_insolation": fallback_insolation,
        "temperature": fallback_temp
    }

def interpolate_flow_for_head(performance_data, target_head) -> float:
    if not performance_data or not isinstance(performance_data, list):
        return 0.0
    try:
        sorted_pts = sorted(performance_data, key=lambda x: x.get("head", 0.0))
    except Exception:
        return 0.0
    if not sorted_pts:
        return 0.0
    if target_head <= sorted_pts[0].get("head", 0.0):
        return sorted_pts[0].get("flow", 0.0)
    if target_head >= sorted_pts[-1].get("head", 0.0):
        return 0.0
    for i in range(len(sorted_pts) - 1):
        p1 = sorted_pts[i]
        p2 = sorted_pts[i+1]
        h1, f1 = p1.get("head", 0.0), p1.get("flow", 0.0)
        h2, f2 = p2.get("head", 0.0), p2.get("flow", 0.0)
        if h1 <= target_head <= h2:
            if h2 == h1:
                return f1
            flow = f1 + (target_head - h1) * (f2 - f1) / (h2 - h1)
            return round(max(0.0, flow), 3)
    return 0.0

def calculate_tdh(lift: float, length: float, diameter: float) -> float:
    """
    Very basic TDH approximation for the AI to use as a baseline.
    In a real-world scenario, Hazen-Williams friction loss formula would be applied more rigorously.
    """
    # Rough approximation of friction loss (assumes simple setup)
    friction_loss_per_100m = 0.0
    if diameter <= 1.0:
        friction_loss_per_100m = 5.0
    elif diameter <= 1.5:
        friction_loss_per_100m = 2.5
    else:
        friction_loss_per_100m = 1.0
        
    friction_head = (length / 100) * friction_loss_per_100m
    tdh = lift + friction_head
    return round(tdh, 2)

def load_pump_catalog():
    # Attempt to load the JSON catalog file from the parent directory
    catalog_path = os.path.join(os.path.dirname(__file__), '..', 'extracted_pumps_data.json')
    try:
        with open(catalog_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Failed to load pump catalog: {e}")
        return {"pumps": []}

def parse_power(power_str: str) -> float:
    if not power_str:
        return 0.0
    try:
        power_str = str(power_str).lower().strip()
        if 'kw' in power_str:
            num = float(power_str.replace('kw', '').strip())
            return num * 1000.0
        if 'w' in power_str:
            return float(power_str.replace('w', '').strip())
        if 'hp' in power_str:
            num = float(power_str.replace('hp', '').strip())
            return num * 746.0
        return float(power_str)
    except Exception:
        return 0.0

@app.post("/api/recommend-pump")
async def recommend_pump(req: PumpSizingRequest):
    # 1. Calculate TDH
    tdh = calculate_tdh(req.vertical_lift_m, req.pipe_length_m, req.pipe_diameter_inch)
    
    # 2. Fetch solar and temperature climatology from NASA
    if req.custom_insolation and len(req.custom_insolation) == 12:
        sol_insolation = req.custom_insolation
        custom_temp = req.custom_temp if (req.custom_temp and len(req.custom_temp) == 12) else [20.0, 21.0, 22.0, 22.0, 21.0, 20.0, 19.0, 19.0, 20.0, 21.0, 21.0, 20.0]
        climate = {
            "sol_insolation": sol_insolation,
            "temperature": custom_temp
        }
    else:
        climate = fetch_nasa_climatology(req.latitude, req.longitude)
        sol_insolation = climate["sol_insolation"]
    
    avg_insolation = sum(sol_insolation) / 12.0 if sol_insolation else 5.5
    
    # Required flow rate (m3/h) = daily water need (m3) / avg peak sun hours (h)
    req_flow_m3h = req.daily_water_need_m3 / avg_insolation if avg_insolation > 0 else 3.0
    
    # 3. Load Catalog
    catalog_data = load_pump_catalog()
    pumps_list = catalog_data.get("pumps", [])
    
    # 4. Evaluate candidates with scoring
    candidates = []
    for p in pumps_list:
        perf = p.get("performanceData", [])
        if not perf:
            continue
        max_head = max((pt.get("head", 0) for pt in perf), default=0)
        flow_at_tdh = interpolate_flow_for_head(perf, tdh)
        
        # Suitability classification
        if tdh > max_head:
            suitability = "Exceeds Limit"
        elif flow_at_tdh <= 0:
            suitability = "Low Capacity"
        elif flow_at_tdh >= req_flow_m3h * 1.5:
            suitability = "Oversized"
        elif flow_at_tdh >= req_flow_m3h * 0.8:
            suitability = "Suitable"
        else:
            suitability = "Low Capacity"
            
        watts = parse_power(p.get("power", ""))
        flow_ratio = flow_at_tdh / req_flow_m3h if req_flow_m3h > 0 else 0
        
        if suitability == "Suitable":
            score = 100 - abs(1.0 - flow_ratio) * 40 - ((watts / 3000) * 10 if watts > 0 else 0)
        elif suitability == "Oversized":
            score = 70 - abs(1.5 - flow_ratio) * 20
        elif suitability == "Low Capacity":
            score = 40 * flow_ratio
        else:
            score = 0
            
        score = max(0, min(99, round(score)))
        
        candidates.append({
            "pump": p,
            "flow_at_tdh": flow_at_tdh,
            "suitability": suitability,
            "score": score,
            "brand": p.get("brand", "UNKNOWN").upper()
        })

    # Group candidates by Brand
    brand_pumps = {}
    for c in candidates:
        b = c["brand"]
        if b not in brand_pumps:
            brand_pumps[b] = []
        brand_pumps[b].append(c)

    # Find the best pump of each brand
    best_by_brand = {}
    order = {"Suitable": 0, "Oversized": 1, "Low Capacity": 2, "Exceeds Limit": 3}
    for b, items in brand_pumps.items():
        items.sort(key=lambda x: (order.get(x["suitability"], 4), -x["score"]))
        if items:
            best_by_brand[b] = items[0]

    # Select best from each brand
    best_redbud = best_by_brand.get("REDBUD", None)
    best_difful = best_by_brand.get("DIFFUL", None)

    # If no pumps matched at all, create dummy targets
    if not best_redbud:
        r_list = [p for p in pumps_list if p.get("brand", "").upper() == "REDBUD"]
        best_redbud = {"pump": r_list[0] if r_list else {"model": "No Matching Redbud Pump Found", "brand": "REDBUD", "power": "N/A", "performanceData": []}, "flow_at_tdh": 0.0, "suitability": "Exceeds Limit", "score": 0}
    
    if not best_difful:
        d_list = [p for p in pumps_list if p.get("brand", "").upper() == "DIFFUL"]
        best_difful = {"pump": d_list[0] if d_list else {"model": "No Matching Difful Pump Found", "brand": "DIFFUL", "power": "N/A", "performanceData": []}, "flow_at_tdh": 0.0, "suitability": "Exceeds Limit", "score": 0}

    # Hydrate Redbud match
    redbud_match = json.loads(json.dumps(best_redbud["pump"]))
    redbud_match["suitability"] = best_redbud["suitability"]
    redbud_match["score"] = best_redbud["score"]
    
    perf_data_r = redbud_match.get("performanceData", [])
    flow_m3h_r = interpolate_flow_for_head(perf_data_r, tdh)
    yield_m3_r = round(flow_m3h_r * avg_insolation * 0.9, 2)
    monthly_yields_r = [round(flow_m3h_r * ins * 0.9, 2) for ins in sol_insolation]
    
    # Calculate daily profile for Redbud
    peak_irr = min(1000.0, (avg_insolation * 1000.0) / 7.72) if avg_insolation > 0 else 0
    daily_profile_r = []
    for h in range(6, 19):
        factor = math.sin(math.pi * (h - 6) / 12)
        irr = round(peak_irr * factor, 1)
        flow_val = round(flow_m3h_r * ((irr - 200) / (peak_irr - 200)), 3) if (irr >= 200 and peak_irr > 200) else 0.0
        daily_profile_r.append({"time": f"{h:02d}:00", "irradiance": irr, "flow": flow_val})
        
    redbud_match["calculated_flow_m3h"] = flow_m3h_r
    redbud_match["daily_water_yield_m3"] = yield_m3_r
    redbud_match["monthly_yields"] = monthly_yields_r
    redbud_match["daily_profile"] = daily_profile_r

    # Hydrate Difful match
    difful_match = json.loads(json.dumps(best_difful["pump"]))
    difful_match["suitability"] = best_difful["suitability"]
    difful_match["score"] = best_difful["score"]
    
    perf_data_d = difful_match.get("performanceData", [])
    flow_m3h_d = interpolate_flow_for_head(perf_data_d, tdh)
    yield_m3_d = round(flow_m3h_d * avg_insolation * 0.9, 2)
    monthly_yields_d = [round(flow_m3h_d * ins * 0.9, 2) for ins in sol_insolation]
    
    # Calculate daily profile for Difful
    daily_profile_d = []
    for h in range(6, 19):
        factor = math.sin(math.pi * (h - 6) / 12)
        irr = round(peak_irr * factor, 1)
        flow_val = round(flow_m3h_d * ((irr - 200) / (peak_irr - 200)), 3) if (irr >= 200 and peak_irr > 200) else 0.0
        daily_profile_d.append({"time": f"{h:02d}:00", "irradiance": irr, "flow": flow_val})
        
    difful_match["calculated_flow_m3h"] = flow_m3h_d
    difful_match["daily_water_yield_m3"] = yield_m3_d
    difful_match["monthly_yields"] = monthly_yields_d
    difful_match["daily_profile"] = daily_profile_d

    ai_reasoning = ""
    if client:
        try:
            prompt = (
                f"You are the SolarFlow Sizing AI Specialist. Analyze the following site specification:\n"
                f"- Location: Lat {req.latitude}, Lng {req.longitude}\n"
                f"- Calculated Total Dynamic Head (TDH): {tdh} m\n"
                f"- Daily Water Need: {req.daily_water_need_m3} m³\n"
                f"- Calculated Required Flow Rate: {req_flow_m3h:.2f} m³/h\n"
                f"- Average Solar Insolation: {avg_insolation:.2f} peak sun hours/day\n\n"
                f"We evaluated our pump inventory catalog and identified two leading matches:\n"
                f"1. REDBUD Match: Model {redbud_match.get('model')} with Suitability '{redbud_match.get('suitability')}' and Score {redbud_match.get('score')}/100. Expected flow at TDH: {flow_m3h_r:.2f} m³/h.\n"
                f"2. DIFFUL Match: Model {difful_match.get('model')} with Suitability '{difful_match.get('suitability')}' and Score {difful_match.get('score')}/100. Expected flow at TDH: {flow_m3h_d:.2f} m³/h.\n\n"
                f"Based on these results, write a concise professional summary (2-3 sentences max) explaining which pump is the best technical fit and why, addressing the flow yield compared to the daily water need and solar conditions."
            )
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a professional hydraulic and solar engineering advisor. Be concise and precise."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=200,
                temperature=0.3,
            )
            ai_reasoning = chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logging.error(f"Groq API call failed: {e}")

    if not ai_reasoning:
        ai_reasoning = (
            f"Selected best options for {tdh}m head and {req_flow_m3h:.2f} m³/h target. "
            f"Redbud match: {redbud_match.get('model')} ({flow_m3h_r:.2f} m³/h). "
            f"Difful match: {difful_match.get('model')} ({flow_m3h_d:.2f} m³/h)."
        )

    return {
        "redbud_match": redbud_match,
        "difful_match": difful_match,
        "calculated_tdh": tdh,
        "ai_reasoning": ai_reasoning,
        "climate_data": climate,
        "target_flow_m3h": round(req_flow_m3h, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
