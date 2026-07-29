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
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
if not api_key or api_key == "your_groq_api_key_here":
    logging.warning("GROQ_API_KEY is missing or not configured in .env")

# Request Model
class PumpSizingRequest(BaseModel):
    latitude: float
    longitude: float
    vertical_lift_m: float
    pipe_length_m: float
    pipe_diameter_inch: float
    daily_water_need_m3: Optional[float] = 20.0

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

@app.post("/api/recommend-pump")
async def recommend_pump(req: PumpSizingRequest):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # 1. Calculate TDH
    tdh = calculate_tdh(req.vertical_lift_m, req.pipe_length_m, req.pipe_diameter_inch)
    
    # 2. Fetch solar and temperature climatology from NASA
    climate = fetch_nasa_climatology(req.latitude, req.longitude)
    sol_insolation = climate["sol_insolation"]
    avg_insolation = sum(sol_insolation) / 12.0 if sol_insolation else 5.5
    
    # Required flow rate (m3/h) = daily water need (m3) / avg peak sun hours (h)
    req_flow_m3h = req.daily_water_need_m3 / avg_insolation if avg_insolation > 0 else 3.0
    
    # 3. Load Catalog
    catalog_data = load_pump_catalog()
    
    # 4. Construct the prompt for Groq
    prompt = f"""
    You are an expert engineering assistant for solar water pump sizing.
    
    USER REQUIREMENTS:
    - Latitude: {req.latitude}
    - Longitude: {req.longitude}
    - Vertical Lift: {req.vertical_lift_m} m
    - Pipe Length: {req.pipe_length_m} m
    - Pipe Diameter: {req.pipe_diameter_inch} inches
    - Calculated Total Dynamic Head (TDH): {tdh} m
    - Daily Water Requirement: {req.daily_water_need_m3} m3/day
    - Annual Average Solar Insolation (Peak Sun Hours): {avg_insolation:.2f} hours/day
    - Target Design Flow Rate: {req_flow_m3h:.2f} m3/h
    
    AVAILABLE PUMP CATALOG (JSON):
    {json.dumps(catalog_data)[:4000]}... [TRUNCATED]
    
    Brief list of all models:
    {[p.get('model') for p in catalog_data.get('pumps', [])]}
    
    Based on the TDH of {tdh}m and target flow rate of {req_flow_m3h:.2f} m3/h, select the absolute best matching pump model from the catalog that can handle this head and flow efficiently.
    Also, select 2 alternative pump models that could work.
    
    RESPOND STRICTLY WITH ONLY VALID JSON. NO MARKDOWN FORMATTING OR PROSE. 
    
    Schema:
    {{
      "exact_match": {{
        "model": "PUMP_MODEL_NAME",
        "reasoning": "Brief explanation why this fits perfectly."
      }},
      "alternatives": [
        {{
          "model": "ALT_MODEL_1",
          "reasoning": "Why this might be an alternative."
        }}
      ]
    }}
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a specialized AI that returns ONLY valid JSON. Do not wrap in ```json markers."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
        )
        
        response_text = completion.choices[0].message.content.strip()
        
        # Clean up possible markdown tags if the model still includes them
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        ai_result = json.loads(response_text)
        
        # Hydrate the results with full catalog data
        exact_model_name = ai_result.get("exact_match", {}).get("model")
        
        # Find exact match and copy it so we don't modify the global loaded catalog
        raw_exact = next((p for p in catalog_data.get("pumps", []) if p.get("model") == exact_model_name), None)
        full_exact_match = json.loads(json.dumps(raw_exact)) if raw_exact else ai_result.get("exact_match")
        
        hydrated_alts = []
        for alt in ai_result.get("alternatives", []):
            alt_model = alt.get("model")
            raw_alt = next((p for p in catalog_data.get("pumps", []) if p.get("model") == alt_model), None)
            if raw_alt:
                full_alt = json.loads(json.dumps(raw_alt))
                hydrated_alts.append(full_alt)
            else:
                hydrated_alts.append(alt)
        
        # Calculate dynamic curves and profiles for exact match
        if full_exact_match and isinstance(full_exact_match, dict):
            perf_data = full_exact_match.get("performanceData", [])
            flow_m3h = interpolate_flow_for_head(perf_data, tdh)
            yield_m3 = round(flow_m3h * avg_insolation * 0.9, 2)
            monthly_yields = [round(flow_m3h * ins * 0.9, 2) for ins in sol_insolation]
            
            # calculate typical daily profile
            peak_irr = min(1000.0, (avg_insolation * 1000.0) / 7.72) if avg_insolation > 0 else 0
            daily_profile = []
            for h in range(6, 19):
                factor = math.sin(math.pi * (h - 6) / 12)
                irr = round(peak_irr * factor, 1)
                if irr >= 200 and peak_irr > 200:
                    flow_val = round(flow_m3h * ((irr - 200) / (peak_irr - 200)), 3)
                else:
                    flow_val = 0.0
                daily_profile.append({
                    "time": f"{h:02d}:00",
                    "irradiance": irr,
                    "flow": flow_val
                })
                
            full_exact_match["calculated_flow_m3h"] = flow_m3h
            full_exact_match["daily_water_yield_m3"] = yield_m3
            full_exact_match["monthly_yields"] = monthly_yields
            full_exact_match["daily_profile"] = daily_profile
            
        # Calculate dynamic curves and profiles for alternatives
        for alt in hydrated_alts:
            if isinstance(alt, dict):
                perf_data = alt.get("performanceData", [])
                flow_m3h = interpolate_flow_for_head(perf_data, tdh)
                yield_m3 = round(flow_m3h * avg_insolation * 0.9, 2)
                monthly_yields = [round(flow_m3h * ins * 0.9, 2) for ins in sol_insolation]
                
                # calculate typical daily profile
                peak_irr = min(1000.0, (avg_insolation * 1000.0) / 7.72) if avg_insolation > 0 else 0
                daily_profile = []
                for h in range(6, 19):
                    factor = math.sin(math.pi * (h - 6) / 12)
                    irr = round(peak_irr * factor, 1)
                    if irr >= 200 and peak_irr > 200:
                        flow_val = round(flow_m3h * ((irr - 200) / (peak_irr - 200)), 3)
                    else:
                        flow_val = 0.0
                    daily_profile.append({
                        "time": f"{h:02d}:00",
                        "irradiance": irr,
                        "flow": flow_val
                    })
                    
                alt["calculated_flow_m3h"] = flow_m3h
                alt["daily_water_yield_m3"] = yield_m3
                alt["monthly_yields"] = monthly_yields
                alt["daily_profile"] = daily_profile
                
        return {
            "exact_match": full_exact_match,
            "alternatives": hydrated_alts,
            "calculated_tdh": tdh,
            "ai_reasoning": ai_result.get("exact_match", {}).get("reasoning", ""),
            "climate_data": climate,
            "target_flow_m3h": round(req_flow_m3h, 2)
        }
        
    except Exception as e:
        logging.error(f"Error during AI recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
