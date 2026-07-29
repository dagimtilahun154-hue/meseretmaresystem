import os
import json
import glob
import re
import math
import fitz  # PyMuPDF
from groq import Groq
from dotenv import load_dotenv
import time

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Path to the main catalog JSON
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CATALOG_PATH = os.path.join(ROOT_DIR, 'extracted_pumps_data.json')

def load_existing_catalog():
    if os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                pass
    return {"categories": [], "pumps": [], "inventory_products": []}

def save_catalog(data):
    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def clean_model_name(model):
    return re.sub(r'[^a-zA-Z0-9.-]', '-', model)

def estimate_motor_prices(power_str):
    power_str = power_str.upper()
    val = 1.0
    
    # Check for kW, W, HP
    kw_match = re.search(r'([0-9.]+)\s*KW', power_str)
    w_match = re.search(r'([0-9.]+)\s*W', power_str)
    hp_match = re.search(r'([0-9.]+)\s*HP', power_str)
    
    if kw_match:
        val = float(kw_match.group(1))
    elif w_match:
        val = float(w_match.group(1)) / 1000.0
    elif hp_match:
        val = float(hp_match.group(1)) * 0.745
    else:
        num_match = re.search(r'([0-9.]+)', power_str)
        if num_match:
            val = float(num_match.group(1))
            if val > 10:  # probably Watts
                val = val / 1000.0
                
    if val <= 0.3:
        price = 120
        cost = 80
    elif val <= 0.5:
        price = 200
        cost = 130
    elif val <= 0.8:
        price = 300
        cost = 200
    elif val <= 1.2:
        price = 450
        cost = 300
    elif val <= 1.8:
        price = 600
        cost = 400
    else:
        price = 800
        cost = 520
        
    return price, cost

def generate_equipment(pump):
    clean_model = clean_model_name(pump.get("model", ""))
    power_str = pump.get("power", "750W")
    first_cat = pump.get("firstCategory", "")
    voltage_str = pump.get("voltage", "220V")
    
    motor_price, motor_cost = estimate_motor_prices(power_str)
    
    equipment = [
        {
            "productId": f"INV-MOTOR-{clean_model}",
            "name": f"Redbud {pump['model']} Pump Motor Unit",
            "quantity": 1,
            "unit": "Piece",
            "price": motor_price,
            "cost": motor_cost
        }
    ]
    
    if "DC Solar" in first_cat:
        ctrl_price = int(motor_price * 0.4)
        ctrl_cost = int(motor_cost * 0.45)
        equipment.append({
            "productId": f"INV-CTRL-{clean_model}",
            "name": f"Redbud {voltage_str} MPPT Solar Controller ({power_str})",
            "quantity": 1,
            "unit": "Piece",
            "price": ctrl_price,
            "cost": ctrl_cost
        })
        
        # Estimate panels
        power_w = 750
        try:
            power_w_match = re.search(r'([0-9.]+)', power_str)
            if power_w_match:
                power_val = float(power_w_match.group(1))
                if "KW" in power_str.upper():
                    power_w = power_val * 1000
                elif "HP" in power_str.upper():
                    power_w = power_val * 745
                else:
                    power_w = power_val
        except Exception:
            pass
            
        panels_count = max(1, math.ceil(power_w / 350))
        equipment.append({
            "productId": "SOLAR-PANEL-400",
            "name": "Mono Solar Panel 400W",
            "quantity": panels_count,
            "unit": "Piece",
            "price": 160,
            "cost": 100
        })
        
        equipment.append({
            "productId": "ACCESSORY-KIT",
            "name": "Solar Pump Installation Accessory Kit (Sensors, Tape, Rope)",
            "quantity": 1,
            "unit": "Set",
            "price": 30,
            "cost": 15
        })
        
        equipment.append({
            "productId": "HDPE-PIPE-50",
            "name": "50mm HDPE Pipe (PN12.5)",
            "quantity": 50,
            "unit": "Meter (m)",
            "price": 5.5,
            "cost": 2.8
        })
        
        equipment.append({
            "productId": "CABLE-4MM",
            "name": "4mm Submersible Cable",
            "quantity": 50,
            "unit": "Meter (m)",
            "price": 2.5,
            "cost": 1.2
        })
        
    elif "AC" in first_cat:
        equipment.append({
            "productId": "AC-CONTROL-BOX",
            "name": "Standard Single Phase AC Control Box",
            "quantity": 1,
            "unit": "Piece",
            "price": 25,
            "cost": 12
        })
        
    return equipment

def add_inventory_products(catalog, pump):
    clean_model = clean_model_name(pump.get("model", ""))
    power_str = pump.get("power", "750W")
    first_cat = pump.get("firstCategory", "")
    voltage_str = pump.get("voltage", "220V")
    
    motor_price, motor_cost = estimate_motor_prices(power_str)
    
    # Motor product
    motor_id = f"INV-MOTOR-{clean_model}"
    add_prod_if_missing(catalog, motor_id, f"MTR-{clean_model}", f"Redbud {pump['model']} Pump Motor Unit", "Pump Equipment", motor_price, motor_cost)
    
    # Controller product
    if "DC Solar" in first_cat:
        ctrl_id = f"INV-CTRL-{clean_model}"
        ctrl_price = int(motor_price * 0.4)
        ctrl_cost = int(motor_cost * 0.45)
        add_prod_if_missing(catalog, ctrl_id, f"CTRL-{clean_model}", f"Redbud {voltage_str} MPPT Solar Controller ({power_str})", "Controller", ctrl_price, ctrl_cost)

def add_prod_if_missing(catalog, prod_id, code, name, category, price, cost):
    inv_prods = catalog.setdefault("inventory_products", [])
    for prod in inv_prods:
        if prod.get("id") == prod_id:
            return
    inv_prods.append({
        "id": prod_id,
        "code": code[:20],
        "name": name,
        "category": category,
        "quantity": 50,
        "costPrice": cost,
        "sellPrice": price,
        "unit": "Piece",
        "measurementUnit": "Piece"
    })

def generate_next_pump_id(catalog):
    max_id = 0
    for p in catalog.get("pumps", []):
        pid = p.get("id", "")
        if pid.startswith("PUMP-") and not pid.startswith("PUMP-CH-"):
            try:
                num = int(pid.split("-")[1])
                if num > max_id:
                    max_id = num
            except (IndexError, ValueError):
                pass
    return f"PUMP-{max_id + 1:03d}"

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text_chunks = []
    current_chunk = ""
    for page in doc:
        text = page.get_text("text")
        if len(current_chunk) + len(text) > 12000:
            text_chunks.append(current_chunk)
            current_chunk = text
        else:
            current_chunk += "\n" + text
            
    if current_chunk:
        text_chunks.append(current_chunk)
    return text_chunks

def parse_pumps_with_ai(text_chunk, filename):
    prompt = f"""
    You are an expert data extraction bot. 
    Below is text extracted from a water pump catalog PDF named '{filename}'.
    Your task is to identify any water pump models mentioned in this text and extract their specifications into a JSON object.
    
    CRITICAL INSTRUCTIONS:
    - Look for pump models.
    - Extract Power (e.g., "750W", "1.5HP", "1.1kW") and Voltage (e.g., "110V", "220V", "380V", "24V", "48V").
    - Deduce the `firstCategory` from the following list (choose the best matching name):
      - "Redbud DC Solar Submersible Pumps"
      - "Redbud DC Solar Surface Pumps"
      - "Redbud AC Submersible Deep Well Pumps"
      - "Redbud AC Surface Pumps"
      - "Redbud AC Sewage & Drainage Pumps"
      - "Redbud Gasoline & Solar Surface Pumps"
    - Deduce the `secondCategory` (e.g., "SDC Series (Plastic Impeller)", "SDM Series (AC Deep Well Submersible)", "WQ Series (AC Sewage & Drainage)", etc.).
    - Extract a 1-2 sentence description of the pump model.
    - Extract the outlet size (e.g., "1.25\"", "1.5\"", "2\"", "1\"").
    - Look for performance data tables showing Head (m) vs Flow (m3/h or L/min).
    - Extract `maxFlow` (the maximum flow rate in m3/h, usually the first value or at minimum head) and `maxHead` (the maximum head lift in meters, usually at zero flow).
    - Construct the `performanceData` array with at least 3-5 points mapping head (m) to flow (m3/h). Ensure values are floats or integers. If flow is in L/min, convert it to m3/h (1 m3/h = 16.67 L/min).
    - Construct the `technicalData` array as a list of parameter-value pairs (e.g. `[[{{"parameter": "Brand", "value": "REDBUD"}}, {{"parameter": "Pump Type", "value": "Submersible"}}, {{"parameter": "Outlet Size", "value": "1.25\""}}]]`). Include parameter names like "Brand", "Pump Type", "Outlet Size", "Max Flow Rate", "Max Head Lift", "Power Input", "Working Voltage".
    
    RESPOND STRICTLY WITH ONLY VALID JSON in the following schema:
    {{
      "pumps": [
        {{
          "model": "Model Name",
          "brand": "REDBUD",
          "firstCategory": "Redbud DC Solar Submersible Pumps",
          "secondCategory": "SDC Series (Plastic Impeller)",
          "power": "750W",
          "voltage": "110V",
          "description": "Redbud 4\" DC Brushless Solar Submersible Pump...",
          "maxFlow": 3.0,
          "maxHead": 30.0,
          "outletSize": "1.25\"",
          "technicalData": [
            {{"parameter": "Brand", "value": "REDBUD"}},
            {{"parameter": "Pump Type", "value": "Submersible"}},
            {{"parameter": "Outlet Size", "value": "1.25\""}},
            {{"parameter": "Max Flow Rate", "value": "3.0 m3/h"}},
            {{"parameter": "Max Head Lift", "value": "30 m"}},
            {{"parameter": "Power Input", "value": "750W"}},
            {{"parameter": "Working Voltage", "value": "110V"}}
          ],
          "performanceData": [
            {{"head": 0.0, "flow": 3.0}},
            {{"head": 10.0, "flow": 2.5}},
            {{"head": 20.0, "flow": 1.8}},
            {{"head": 30.0, "flow": 0.0}}
          ]
        }}
      ]
    }}
    
    If no pump models or performance data are found in this chunk, return: {{"pumps": []}}
    
    TEXT:
    {text_chunk}
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a JSON-only data extractor. Do not wrap in markdown ```json markers. Return a JSON object with key 'pumps'."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        
        response_text = completion.choices[0].message.content.strip()
        parsed = json.loads(response_text)
        return parsed.get("pumps", [])
    except Exception as e:
        print(f"Error parsing chunk from {filename}: {e}")
        return []

def main():
    catalog = load_existing_catalog()
    existing_models = {p.get("model") for p in catalog.get("pumps", []) if p.get("model")}
    
    # Find PDFs in root directory
    pdf_files = glob.glob(os.path.join(ROOT_DIR, "*.pdf"))
    
    for pdf in pdf_files:
        filename = os.path.basename(pdf)
        if not ("AC water pumps" in filename or "DC solar water pumps" in filename or "陆地泵" in filename):
            print(f"Skipping non-catalog PDF: {filename}")
            continue
            
        safe_filename = filename.encode('ascii', errors='replace').decode('ascii')
        print(f"Processing {safe_filename}...")
        
        chunks = extract_text_from_pdf(pdf)
        print(f"  Extracted {len(chunks)} chunks.")
        
        # If text length is 0 (scanned image), print a warning and skip
        total_text_len = sum(len(c) for c in chunks)
        if total_text_len == 0:
            print(f"  Warning: No extractable text found in {safe_filename}. Skipping content extraction (scanned images).")
            continue
            
        for i, chunk in enumerate(chunks):
            # Skip empty chunks
            if not chunk.strip():
                continue
                
            print(f"  Sending chunk {i+1}/{len(chunks)} to AI...")
            new_pumps = parse_pumps_with_ai(chunk, filename)
            
            added_count = 0
            for pump in new_pumps:
                model_name = pump.get("model")
                if model_name and model_name not in existing_models:
                    # Enrich metadata
                    pump["source_pdf"] = filename
                    pump["sourceUrl"] = filename
                    pump["status"] = "Published"
                    
                    # Generate ID
                    if "陆地泵" in filename:
                        pump["id"] = f"PUMP-CH-{model_name}"
                    else:
                        pump["id"] = generate_next_pump_id(catalog)
                        
                    # Standard titles
                    pump["introductionTitle"] = "Overview"
                    pump["technicalDataTitle"] = "Technical Parameters"
                    pump["hydraulicCurveTitle"] = "Hydraulic Performance Curve"
                    pump["hydraulicCurveImage"] = ""
                    pump["image"] = ""
                    pump["controllerImage"] = ""
                    pump["panelImage"] = ""
                    
                    # Programmatic equipment and inventory mapping
                    pump["equipment"] = generate_equipment(pump)
                    add_inventory_products(catalog, pump)
                    
                    catalog["pumps"].append(pump)
                    existing_models.add(model_name)
                    added_count += 1
                    
            print(f"  Found {len(new_pumps)} pumps in chunk, {added_count} new models added.")
            time.sleep(2)  # Basic rate limiting
            
    save_catalog(catalog)
    print(f"\nExtraction complete! Total models in catalog: {len(catalog.get('pumps', []))}")

if __name__ == "__main__":
    main()
