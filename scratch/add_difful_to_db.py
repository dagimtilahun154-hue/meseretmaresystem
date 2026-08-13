import json
import os
import re
import subprocess

json_path = 'C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/extracted_pumps_data.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Existing categories & pumps
categories = data.get('categories', [])
pumps = data.get('pumps', [])
inventory_products = data.get('inventory_products', [])

# Check if DIFFUL categories already exist
cat_names = [c['name'] for c in categories]

difful_categories = [
    {
        "name": "DIFFUL Submersible Deep Well Pumps",
        "description": "High-efficiency DC/AC solar submersible deep well pumps",
        "icon": "Droplets",
        "sortOrder": 7
    },
    {
        "name": "DIFFUL Plastic Impeller Solar Pumps",
        "description": "Durable solar powered plastic impeller submersible pumps",
        "icon": "Sun",
        "sortOrder": 8
    },
    {
        "name": "DIFFUL DC Surface Pumps",
        "description": "High performance DC surface centrifugal solar pumps",
        "icon": "Zap",
        "sortOrder": 9
    }
]

for dc in difful_categories:
    if dc['name'] not in cat_names:
        categories.append(dc)

# 8 DIFFUL Pumps from seed definition
difful_pumps = [
    {
        "id": "difful-4dgs3-100-2200",
        "model": "4DGS3-100/5-2200S-A/D",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Submersible Deep Well Pumps",
        "secondCategory": "Deep Well Submersible Pump",
        "power": "2200W",
        "voltage": "DC 80V-420V",
        "description": "6000rpm High Speed Solar Submersible Deep Well Pump with 3m³/h rated flow and 100m rated head.",
        "image": "/uploads/submersible-pump.jpg",
        "controllerImage": "/uploads/submersible-controller.jpg",
        "panelImage": "/uploads/solar-panel.jpg",
        "introductionTitle": "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
        "technicalDataTitle": "6000rpm High Speed Deep Well Pump Technical Data",
        "hydraulicCurveTitle": "Hydraulic Performance Curves",
        "hydraulicCurveImage": "/uploads/6000rpm-hydraulic-curve.png",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 8.38,
        "maxHead": 117,
        "outletSize": "1.25 inch",
        "technicalData": [
            {
                "item": "4DGS3-100/5-2200S-A/D",
                "ratedFlow": 3,
                "ratedHead": 100,
                "maxFlow": 8,
                "maxHead": 117,
                "acVoltage": 220,
                "optimumDcVoltage": "300-400",
                "openCircuitVoltage": "< 430",
                "powerKw": 2.2,
                "outletInch": 1.25,
                "outletDiameterMm": 100,
                "cableM": 2,
                "pumpHeightMm": 618,
                "pumpWeightKg": 8.9
            }
        ],
        "performanceData": [
            {"head": 111.38, "flow": 1}, {"head": 106.28, "flow": 2.01}, {"head": 99.75, "flow": 3},
            {"head": 89.85, "flow": 4.02}, {"head": 77.31, "flow": 5.01}, {"head": 59.25, "flow": 6},
            {"head": 41.81, "flow": 7}, {"head": 17.94, "flow": 8.01}, {"head": 8.66, "flow": 8.38}
        ],
        "equipment": [
            {"name": "Pump – 2200W", "quantity": 1, "unit": "Piece", "price": 35000},
            {"name": "Pump Controller – 2200W", "quantity": 1, "unit": "Piece", "price": 8000},
            {"name": "Solar Panels", "quantity": 8, "unit": "Piece", "price": 6500},
            {"name": "Solar Panel Rod", "quantity": 1, "unit": "Pack", "price": 2500},
            {"name": "HDPE Pipe – 1.5 inch", "quantity": 1, "unit": "Roll", "price": 3000},
            {"name": "Foot Valve – 4 inch", "quantity": 1, "unit": "Piece", "price": 800},
            {"name": "Float Switch", "quantity": 1, "unit": "Piece", "price": 600}
        ]
    },
    {
        "id": "difful-4dgs8-40-2200",
        "model": "4DGS8-40/2-2200S-A/D",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Submersible Deep Well Pumps",
        "secondCategory": "Deep Well Submersible Pump",
        "power": "2200W",
        "voltage": "DC 80V-420V",
        "description": "High speed solar submersible deep well pump with 8m³/h rated flow and 40m rated head.",
        "image": "/uploads/submersible-pump.jpg",
        "controllerImage": "/uploads/submersible-controller.jpg",
        "panelImage": "/uploads/solar-panel.jpg",
        "introductionTitle": "6000rpm High Speed Deep Well Pump with 8m³/h Rated Flow",
        "technicalDataTitle": "Technical Data",
        "hydraulicCurveTitle": "Hydraulic Performance Curves",
        "hydraulicCurveImage": "/uploads/6000rpm-8-hydraulic-curve.png",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 14,
        "maxHead": 52,
        "outletSize": "2.0 inch",
        "technicalData": [
            {
                "item": "4DGS8-40/2-2200S-A/D",
                "ratedFlow": 8,
                "ratedHead": 40,
                "maxFlow": 14,
                "maxHead": 52,
                "acVoltage": 220,
                "optimumDcVoltage": "300-400",
                "openCircuitVoltage": "< 430",
                "powerKw": 2.2,
                "outletInch": 2.0,
                "outletDiameterMm": 100,
                "cableM": 2,
                "pumpHeightMm": 580,
                "pumpWeightKg": 8.5
            }
        ],
        "performanceData": [
            {"head": 52, "flow": 1}, {"head": 48, "flow": 4}, {"head": 40, "flow": 8},
            {"head": 30, "flow": 10}, {"head": 20, "flow": 12}, {"head": 5, "flow": 14}
        ],
        "equipment": [
            {"name": "Pump – 2200W High Flow", "quantity": 1, "unit": "Piece", "price": 38000},
            {"name": "Pump Controller – 2200W", "quantity": 1, "unit": "Piece", "price": 8000},
            {"name": "Solar Panels 330W", "quantity": 8, "unit": "Piece", "price": 6500},
            {"name": "HDPE Pipe – 2 inch", "quantity": 1, "unit": "Roll", "price": 4000},
            {"name": "Float Switch", "quantity": 1, "unit": "Piece", "price": 600}
        ]
    },
    {
        "id": "difful-4dgs15-31-3000",
        "model": "4DGS15-31/2-3000-A/D",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Submersible Deep Well Pumps",
        "secondCategory": "Deep Well Submersible Pump",
        "power": "3000W",
        "voltage": "DC 120V-500V",
        "description": "High speed solar submersible deep well pump with 15m³/h rated flow and 31m rated head.",
        "image": "/uploads/submersible-pump.jpg",
        "controllerImage": "/uploads/submersible-controller.jpg",
        "panelImage": "/uploads/solar-panel.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 22,
        "maxHead": 42,
        "outletSize": "2.0 inch",
        "technicalData": [
            {
                "item": "4DGS15-31/2-3000-A/D",
                "ratedFlow": 15,
                "ratedHead": 31,
                "maxFlow": 22,
                "maxHead": 42,
                "acVoltage": 380,
                "optimumDcVoltage": "520-750",
                "powerKw": 3.0,
                "outletInch": 2.0
            }
        ],
        "performanceData": [
            {"head": 42, "flow": 1}, {"head": 38, "flow": 8}, {"head": 31, "flow": 15},
            {"head": 22, "flow": 18}, {"head": 10, "flow": 22}
        ],
        "equipment": [
            {"name": "Pump – 3000W High Flow", "quantity": 1, "unit": "Piece", "price": 45000},
            {"name": "Pump Controller – 3000W", "quantity": 1, "unit": "Piece", "price": 10000},
            {"name": "Solar Panels 330W", "quantity": 10, "unit": "Piece", "price": 6500}
        ]
    },
    {
        "id": "difful-4dgs20-28-3000",
        "model": "4DGS20-28/2-3000-A/D",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Submersible Deep Well Pumps",
        "secondCategory": "Deep Well Submersible Pump",
        "power": "3000W",
        "voltage": "DC 120V-500V",
        "description": "High speed solar submersible deep well pump with 20m³/h rated flow and 28m rated head.",
        "image": "/uploads/submersible-pump.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 28,
        "maxHead": 38,
        "outletSize": "2.5 inch",
        "technicalData": [
            {
                "item": "4DGS20-28/2-3000-A/D",
                "ratedFlow": 20,
                "ratedHead": 28,
                "maxFlow": 28,
                "maxHead": 38,
                "powerKw": 3.0,
                "outletInch": 2.5
            }
        ],
        "performanceData": [
            {"head": 38, "flow": 2}, {"head": 33, "flow": 10}, {"head": 28, "flow": 20},
            {"head": 15, "flow": 25}, {"head": 5, "flow": 28}
        ],
        "equipment": [
            {"name": "Pump – 3000W Ultra Flow", "quantity": 1, "unit": "Piece", "price": 47000},
            {"name": "Pump Controller – 3000W", "quantity": 1, "unit": "Piece", "price": 10000},
            {"name": "Solar Panels 330W", "quantity": 10, "unit": "Piece", "price": 6500}
        ]
    },
    {
        "id": "difful-4dpc6-56-750",
        "model": "4DPC6-56-110-750-HV",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Plastic Impeller Solar Pumps",
        "secondCategory": "Plastic Impeller Submersible Pump",
        "power": "750W",
        "voltage": "DC 110V",
        "description": "Solar powered pump with plastic impeller, ideal for agricultural water supply.",
        "image": "/uploads/submersible-pump.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 6.39,
        "maxHead": 56,
        "outletSize": "1.25 inch",
        "technicalData": [],
        "performanceData": [
            {"head": 54.26, "flow": 0.03}, {"head": 50.99, "flow": 0.52}, {"head": 49.36, "flow": 1.01},
            {"head": 47.01, "flow": 1.54}, {"head": 45.28, "flow": 2.02}, {"head": 41.91, "flow": 2.52},
            {"head": 38.45, "flow": 3.01}, {"head": 33.45, "flow": 3.55}, {"head": 29.78, "flow": 4.1},
            {"head": 26.31, "flow": 4.52}, {"head": 21.62, "flow": 4.97}, {"head": 17.74, "flow": 5.53},
            {"head": 12.03, "flow": 6.01}, {"head": 6.83, "flow": 6.39}
        ],
        "equipment": [
            {"name": "Pump – 750W", "quantity": 1, "unit": "Piece", "price": 12000},
            {"name": "Pump Controller – 750W", "quantity": 1, "unit": "Piece", "price": 4500},
            {"name": "Solar Panels 330W", "quantity": 3, "unit": "Piece", "price": 6500}
        ]
    },
    {
        "id": "difful-4dpc9-45-750",
        "model": "4DPC9-45-110-750-HV",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL Plastic Impeller Solar Pumps",
        "secondCategory": "Plastic Impeller Submersible Pump",
        "power": "750W",
        "voltage": "DC 110V",
        "description": "High-flow solar submersible pump with plastic impeller for irrigation.",
        "image": "/uploads/submersible-pump.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 9.04,
        "maxHead": 51,
        "outletSize": "1.5 inch",
        "technicalData": [],
        "performanceData": [
            {"head": 50.99, "flow": 1.08}, {"head": 50.07, "flow": 2.04}, {"head": 48.03, "flow": 3.05},
            {"head": 42.73, "flow": 4.05}, {"head": 33.96, "flow": 5.08}, {"head": 26.82, "flow": 6.0},
            {"head": 18.86, "flow": 7.05}, {"head": 10.91, "flow": 8.07}, {"head": 2.03, "flow": 9.04}
        ],
        "equipment": [
            {"name": "Pump – 750W High Flow", "quantity": 1, "unit": "Piece", "price": 13500},
            {"name": "Pump Controller – 750W", "quantity": 1, "unit": "Piece", "price": 4500},
            {"name": "Solar Panels 330W", "quantity": 3, "unit": "Piece", "price": 6500}
        ]
    },
    {
        "id": "difful-dcpm6-24-550",
        "model": "DCPM6-24-48-550",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL DC Surface Pumps",
        "secondCategory": "DC Surface Pump",
        "power": "550W",
        "voltage": "DC 48V",
        "description": "Domestic centrifugal surface pump with solar power, perfect for home gardening and livestock.",
        "image": "/uploads/surface-pump.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 4.99,
        "maxHead": 24.5,
        "outletSize": "1.0 inch",
        "technicalData": [],
        "performanceData": [
            {"head": 24.47, "flow": 0.51}, {"head": 22.23, "flow": 1.04}, {"head": 20.9, "flow": 1.52},
            {"head": 19.27, "flow": 2.01}, {"head": 17.84, "flow": 2.48}, {"head": 16.31, "flow": 3.04},
            {"head": 15.19, "flow": 3.47}, {"head": 12.03, "flow": 4.46}, {"head": 9.48, "flow": 4.99}
        ],
        "equipment": [
            {"name": "Surface Pump DCPM6", "quantity": 1, "unit": "Piece", "price": 18000},
            {"name": "Pump Controller 48V", "quantity": 1, "unit": "Piece", "price": 6000},
            {"name": "Solar Panel 270W", "quantity": 2, "unit": "Piece", "price": 6500}
        ]
    },
    {
        "id": "difful-dcpm21-14-750",
        "model": "DCPM21-14-72-750",
        "brand": "DIFFUL",
        "firstCategory": "DIFFUL DC Surface Pumps",
        "secondCategory": "DC Surface Pump",
        "power": "750W",
        "voltage": "DC 72V",
        "description": "High capacity centrifugal surface solar pump for agricultural transfer.",
        "image": "/uploads/surface-pump.jpg",
        "sourceUrl": "https://www.diffulpump.com/",
        "maxFlow": 21,
        "maxHead": 14,
        "outletSize": "2.0 inch",
        "technicalData": [],
        "performanceData": [
            {"head": 14, "flow": 1.0}, {"head": 12, "flow": 10.0}, {"head": 10, "flow": 15.0}, {"head": 5, "flow": 21.0}
        ],
        "equipment": [
            {"name": "Surface Pump DCPM21", "quantity": 1, "unit": "Piece", "price": 21000},
            {"name": "Pump Controller 72V", "quantity": 1, "unit": "Piece", "price": 7000},
            {"name": "Solar Panel 330W", "quantity": 3, "unit": "Piece", "price": 6500}
        ]
    }
]

existing_ids = set(p['id'] for p in pumps)
for dp in difful_pumps:
    if dp['id'] not in existing_ids:
        pumps.append(dp)

# Write updated JSON
data['categories'] = categories
data['pumps'] = pumps

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Successfully updated extracted_pumps_data.json with {len(difful_pumps)} DIFFUL pumps!")
print(f"Total categories: {len(categories)}, Total pumps: {len(pumps)}")
