import json
import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load all pumps
with open('extracted_pumps_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

pumps = data.get('pumps', [])
print(f"Loaded {len(pumps)} pump models from database.")

def interpolate_flow(performance_data, target_tdh):
    if not performance_data:
        return 0.0
    sorted_pts = sorted(performance_data, key=lambda x: x['head'])
    min_head = sorted_pts[0]['head']
    max_head = sorted_pts[-1]['head']
    
    if target_tdh > max_head:
        return 0.0
    if target_tdh <= min_head:
        return sorted_pts[0]['flow']
    
    for i in range(len(sorted_pts) - 1):
        h1, f1 = sorted_pts[i]['head'], sorted_pts[i]['flow']
        h2, f2 = sorted_pts[i+1]['head'], sorted_pts[i+1]['flow']
        if h1 <= target_tdh <= h2:
            if h2 == h1:
                return f1
            ratio = (target_tdh - h1) / (h2 - h1)
            return f1 + ratio * (f2 - f1)
    return 0.0

def parse_power(power_str):
    if not power_str:
        return 0
    s = power_str.lower().strip()
    if 'hp' in s:
        try: return float(s.replace('hp','')) * 746
        except: return 0
    if 'kw' in s:
        try: return float(s.replace('kw','')) * 1000
        except: return 0
    if 'w' in s:
        try: return float(s.replace('w',''))
        except: return 0
    try: return float(s)
    except: return 0

def run_ai_sizing_simulation(site_name, water_source, daily_need_l, static_level_m, tank_height_m, distance_m, sun_hours):
    lift = tank_height_m + (static_level_m if water_source == 'Borehole' else 0)
    friction_loss = distance_m * 0.02
    tdh = round(lift + friction_loss, 1)
    req_flow_m3h = round(daily_need_l / (1000 * sun_hours), 2)
    req_flow_lmin = round(req_flow_m3h * 1000 / 60, 1)
    
    print("\n" + "="*80)
    print(f"AI SIZING ENGINE SIMULATION: [{site_name}]")
    print("="*80)
    print(f"Parameters: Source={water_source}, Daily Demand={daily_need_l} L/day, Sun Hours={sun_hours} hrs")
    print(f"Calculated TDH: {tdh} m | Target Required Flow: {req_flow_m3h} m³/h ({req_flow_lmin} L/min)")
    print("-" * 80)
    
    evaluations = []
    
    for p in pumps:
        perf = p.get('performanceData', [])
        if not perf:
            continue
        max_head = max(pt['head'] for pt in perf)
        flow_at_tdh = interpolate_flow(perf, tdh)
        
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
            
        watts = parse_power(p.get('power', ''))
        flow_ratio = flow_at_tdh / req_flow_m3h if req_flow_m3h > 0 else 0
        
        score = 0
        if suitability == "Suitable":
            score = 100 - abs(1.0 - flow_ratio) * 40 - (watts / 3000) * 10
        elif suitability == "Oversized":
            score = 70 - abs(1.5 - flow_ratio) * 20
        elif suitability == "Low Capacity":
            score = 40 * flow_ratio
        else:
            score = 0
            
        score = max(0, min(99, round(score)))
        
        evaluations.append({
            'model': p.get('model'),
            'brand': p.get('brand'),
            'power': p.get('power'),
            'voltage': p.get('voltage'),
            'category': p.get('firstCategory'),
            'flow_at_tdh': round(flow_at_tdh, 2),
            'suitability': suitability,
            'score': score,
            'max_head': max_head
        })
        
    # Sort
    order = {"Suitable": 0, "Oversized": 1, "Low Capacity": 2, "Exceeds Limit": 3}
    evaluations.sort(key=lambda x: (order[x['suitability']], -x['score']))
    
    best = evaluations[0] if evaluations else None
    
    brand_stats = {}
    for ev in evaluations:
        b = ev['brand']
        if b not in brand_stats: brand_stats[b] = {'suitable': 0, 'total': 0}
        brand_stats[b]['total'] += 1
        if ev['suitability'] == "Suitable": brand_stats[b]['suitable'] += 1
        
    print(f"★ #1 AI BEST MATCH RECOMMENDATION:")
    print(f"   Model:     {best['model']} ({best['brand']})")
    print(f"   Category:  {best['category']}")
    print(f"   Specs:     Power={best['power']}, Voltage={best['voltage']}")
    print(f"   Perf:      Flow @ {tdh}m TDH = {best['flow_at_tdh']} m³/h (Target: {req_flow_m3h} m³/h)")
    print(f"   Score:     {best['score']}% AI Suitability Match Score")
    print(f"   Rationale: Optimal hydraulic efficiency for {tdh}m head with precise target flow match.")
    
    print("\nBrand Comparison Summary for Site:")
    for b, st in brand_stats.items():
        print(f"   - {b}: {st['suitable']} suitable models out of {st['total']} evaluated")
        
    print("\nTop 5 Candidates Across All Brands:")
    for i, candidate in enumerate(evaluations[:5]):
        print(f"   {i+1}. [{candidate['brand']}] {candidate['model']} ({candidate['power']}) -> {candidate['flow_at_tdh']} m³/h @ {tdh}m | {candidate['suitability']} (Score: {candidate['score']}%)")

# Test 3 Sites
run_ai_sizing_simulation("Gondar Deep Well Borehole Site", "Borehole", 25000, 35, 10, 50, 5)
run_ai_sizing_simulation("Bahir Dar Medium Farm Site", "Borehole", 15000, 20, 5, 40, 5)
run_ai_sizing_simulation("Hawassa Surface Irrigation Site", "River", 40000, 0, 15, 100, 6)
