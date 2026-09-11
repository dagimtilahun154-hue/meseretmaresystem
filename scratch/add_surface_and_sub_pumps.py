import json

with open('extracted_pumps_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

pumps = data.get('pumps', [])
existing_models = {p['model'] for p in pumps}

# Add Surface pump models if not present
surface_pumps = [
    # DIFFUL Surface Pumps
    {
        'id': 'PUMP-DIFFUL-DCPM50',
        'model': 'DCPM50-17-110-1500',
        'brand': 'DIFFUL',
        'pumpType': 'Surface',
        'firstCategory': 'Difful DC Solar Surface Pumps',
        'secondCategory': 'DCPM Series (Solar Centrifugal)',
        'power': '1500W',
        'voltage': '110V',
        'description': 'Difful 1.5kW DC Brushless Solar Centrifugal Surface Pump for river, canal, and pond irrigation.',
        'maxFlow': 50.0,
        'maxHead': 17,
        'outletSize': '3"',
        'price': 24000,
        'performanceData': [
            {'head': 0, 'flow': 50.0},
            {'head': 5, 'flow': 45.0},
            {'head': 10, 'flow': 38.0},
            {'head': 14, 'flow': 24.0},
            {'head': 17, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-DIFFUL-DCPM65',
        'model': 'DCPM65-20-150-2200',
        'brand': 'DIFFUL',
        'pumpType': 'Surface',
        'firstCategory': 'Difful DC Solar Surface Pumps',
        'secondCategory': 'DCPM Series (Solar Centrifugal)',
        'power': '2200W',
        'voltage': '150V',
        'description': 'Difful 2.2kW DC Solar Centrifugal Surface Pump for high volume low-lift transfer and irrigation.',
        'maxFlow': 65.0,
        'maxHead': 20,
        'outletSize': '3"',
        'price': 32000,
        'performanceData': [
            {'head': 0, 'flow': 65.0},
            {'head': 6, 'flow': 58.0},
            {'head': 12, 'flow': 46.0},
            {'head': 16, 'flow': 28.0},
            {'head': 20, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-DIFFUL-DCPM80',
        'model': 'DCPM80-22-200-3000',
        'brand': 'DIFFUL',
        'pumpType': 'Surface',
        'firstCategory': 'Difful AC/DC Solar Surface Pumps',
        'secondCategory': 'DCPM Series (Solar Centrifugal)',
        'power': '3000W',
        'voltage': '200-380V',
        'description': 'Difful 3.0kW Solar Surface Centrifugal Booster & Irrigation Pump.',
        'maxFlow': 80.0,
        'maxHead': 22,
        'outletSize': '4"',
        'price': 42000,
        'performanceData': [
            {'head': 0, 'flow': 80.0},
            {'head': 8, 'flow': 70.0},
            {'head': 14, 'flow': 55.0},
            {'head': 18, 'flow': 32.0},
            {'head': 22, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-DIFFUL-DFSU100',
        'model': 'DFSU100-28-380-5500',
        'brand': 'DIFFUL',
        'pumpType': 'Surface',
        'firstCategory': 'Difful AC/DC Solar Surface Pumps',
        'secondCategory': 'DFSU High-Flow Centrifugal Series',
        'power': '5.5kW',
        'voltage': '380V',
        'description': 'Difful 5.5kW Heavy-Duty Solar Surface Centrifugal Pump. Delivers 83.3 m3/h (23.2 L/s) at 12m Total Dynamic Head with >68% wire-to-water efficiency.',
        'maxFlow': 100.0,
        'maxHead': 28,
        'outletSize': '4"',
        'price': 58000,
        'performanceData': [
            {'head': 0, 'flow': 100.0},
            {'head': 8, 'flow': 92.0},
            {'head': 12, 'flow': 83.5},
            {'head': 16, 'flow': 72.0},
            {'head': 22, 'flow': 48.0},
            {'head': 28, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-DIFFUL-DFSU120',
        'model': 'DFSU120-35-380-7500',
        'brand': 'DIFFUL',
        'pumpType': 'Surface',
        'firstCategory': 'Difful AC/DC Solar Surface Pumps',
        'secondCategory': 'DFSU High-Flow Centrifugal Series',
        'power': '7.5kW',
        'voltage': '380V',
        'description': 'Difful 7.5kW Industrial Solar Surface Centrifugal Pump for commercial farming clusters.',
        'maxFlow': 120.0,
        'maxHead': 35,
        'outletSize': '4"',
        'price': 72000,
        'performanceData': [
            {'head': 0, 'flow': 120.0},
            {'head': 10, 'flow': 110.0},
            {'head': 18, 'flow': 95.0},
            {'head': 25, 'flow': 75.0},
            {'head': 35, 'flow': 0.0}
        ]
    },
    # REDBUD Surface Pumps
    {
        'id': 'PUMP-REDBUD-SCPM45',
        'model': 'SCPM45-16-110-1500',
        'brand': 'REDBUD',
        'pumpType': 'Surface',
        'firstCategory': 'Redbud Solar Surface Pumps',
        'secondCategory': 'SCPM Series (Centrifugal Surface)',
        'power': '1500W',
        'voltage': '110V',
        'description': 'Redbud 1.5kW DC Brushless Solar Surface Centrifugal Pump.',
        'maxFlow': 45.0,
        'maxHead': 16,
        'outletSize': '3"',
        'price': 23500,
        'performanceData': [
            {'head': 0, 'flow': 45.0},
            {'head': 5, 'flow': 40.0},
            {'head': 10, 'flow': 32.0},
            {'head': 14, 'flow': 18.0},
            {'head': 16, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-REDBUD-SCPM60',
        'model': 'SCPM60-18-150-2200',
        'brand': 'REDBUD',
        'pumpType': 'Surface',
        'firstCategory': 'Redbud Solar Surface Pumps',
        'secondCategory': 'SCPM Series (Centrifugal Surface)',
        'power': '2200W',
        'voltage': '150V',
        'description': 'Redbud 2.2kW Solar Surface Centrifugal Irrigation Pump.',
        'maxFlow': 60.0,
        'maxHead': 18,
        'outletSize': '3"',
        'price': 31000,
        'performanceData': [
            {'head': 0, 'flow': 60.0},
            {'head': 6, 'flow': 54.0},
            {'head': 11, 'flow': 42.0},
            {'head': 15, 'flow': 25.0},
            {'head': 18, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-REDBUD-SCM100',
        'model': 'SCM100-25-380-5500',
        'brand': 'REDBUD',
        'pumpType': 'Surface',
        'firstCategory': 'Redbud Solar Surface Pumps',
        'secondCategory': 'SCM High-Capacity Surface Series',
        'power': '5.5kW',
        'voltage': '380V',
        'description': 'Redbud 5.5kW Solar Centrifugal Surface Pump. Engineered for 12m head @ 83.33 m3/h (23.2 L/s) discharge capacity at >68% efficiency.',
        'maxFlow': 100.0,
        'maxHead': 25,
        'outletSize': '4"',
        'price': 56000,
        'performanceData': [
            {'head': 0, 'flow': 100.0},
            {'head': 6, 'flow': 94.0},
            {'head': 12, 'flow': 83.33},
            {'head': 18, 'flow': 64.0},
            {'head': 25, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-REDBUD-SCM120',
        'model': 'SCM120-32-380-7500',
        'brand': 'REDBUD',
        'pumpType': 'Surface',
        'firstCategory': 'Redbud Solar Surface Pumps',
        'secondCategory': 'SCM High-Capacity Surface Series',
        'power': '7.5kW',
        'voltage': '380V',
        'description': 'Redbud 7.5kW Solar Centrifugal Surface Pump for massive flood and furrow irrigation.',
        'maxFlow': 120.0,
        'maxHead': 32,
        'outletSize': '4"',
        'price': 69000,
        'performanceData': [
            {'head': 0, 'flow': 120.0},
            {'head': 10, 'flow': 108.0},
            {'head': 18, 'flow': 92.0},
            {'head': 24, 'flow': 70.0},
            {'head': 32, 'flow': 0.0}
        ]
    },
    # Submersible Pumps matching 34m @ 6.0 L/s (21.0 m3/h) @ 3.3kW+
    {
        'id': 'PUMP-REDBUD-4SDC20-55',
        'model': '4SDC20-55-220-3300',
        'brand': 'REDBUD',
        'pumpType': 'Submersible',
        'firstCategory': 'Redbud DC Solar Submersible Pumps',
        'secondCategory': '4SDC High-Discharge Series',
        'power': '3.3kW',
        'voltage': '220V',
        'description': 'Redbud 3.3kW 4" Solar Submersible Borehole Pump. Delivers 21.0 m3/h (6.0 L/s) at 34m Total Dynamic Head with 68% pump efficiency.',
        'maxFlow': 25.0,
        'maxHead': 55,
        'outletSize': '2"',
        'price': 38000,
        'performanceData': [
            {'head': 0, 'flow': 25.0},
            {'head': 15, 'flow': 24.2},
            {'head': 25, 'flow': 23.0},
            {'head': 34, 'flow': 21.0},
            {'head': 45, 'flow': 14.0},
            {'head': 55, 'flow': 0.0}
        ]
    },
    {
        'id': 'PUMP-DIFFUL-4DSC22-55',
        'model': '4DSC22-55-220-3300',
        'brand': 'DIFFUL',
        'pumpType': 'Submersible',
        'firstCategory': 'Difful DC Solar Submersible Pumps',
        'secondCategory': '4DSC Stainless Steel Impeller Series',
        'power': '3.3kW',
        'voltage': '220V',
        'description': 'Difful 3.3kW 4" Submersible Deep Well Pump. Delivers 21.2 m3/h (5.9 L/s) at 34m Head Lift with 67% efficiency.',
        'maxFlow': 25.0,
        'maxHead': 55,
        'outletSize': '2"',
        'price': 39500,
        'performanceData': [
            {'head': 0, 'flow': 25.0},
            {'head': 15, 'flow': 24.0},
            {'head': 25, 'flow': 22.8},
            {'head': 34, 'flow': 21.2},
            {'head': 45, 'flow': 13.5},
            {'head': 55, 'flow': 0.0}
        ]
    }
]

# Ensure existing pumps have pumpType
for p in pumps:
    if 'pumpType' not in p:
        p['pumpType'] = 'Submersible'

# Add the new pumps
added_count = 0
for sp in surface_pumps:
    if sp['model'] not in existing_models:
        sp['equipment'] = [
            {'productId': f'INV-MOTOR-{sp["model"]}', 'name': f'{sp["brand"]} {sp["model"]} Motor Unit', 'quantity': 1, 'unit': 'Piece', 'price': sp['price'] * 0.7, 'cost': sp['price'] * 0.45},
            {'productId': f'INV-CTRL-{sp["model"]}', 'name': f'{sp["brand"]} MPPT Solar Pump Controller', 'quantity': 1, 'unit': 'Piece', 'price': sp['price'] * 0.3, 'cost': sp['price'] * 0.18}
        ]
        sp['technicalData'] = [
            {'parameter': 'Brand', 'value': sp['brand']},
            {'parameter': 'Pump Type', 'value': sp['pumpType']},
            {'parameter': 'Outlet Size', 'value': sp['outletSize']},
            {'parameter': 'Max Flow Rate', 'value': f'{sp["maxFlow"]} m3/h'},
            {'parameter': 'Max Head Lift', 'value': f'{sp["maxHead"]} m'},
            {'parameter': 'Power Input', 'value': sp['power']},
            {'parameter': 'Working Voltage', 'value': sp['voltage']}
        ]
        pumps.append(sp)
        existing_models.add(sp['model'])
        added_count += 1

print(f'Successfully added {added_count} surface & submersible pump models to extracted_pumps_data.json!')

data['pumps'] = pumps
with open('extracted_pumps_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
