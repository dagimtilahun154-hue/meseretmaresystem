import re
import json

with open('C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/backend/prisma/seed_pumps.ts', 'r', encoding='utf-8') as f:
    text = f.read()

models = re.findall(r'model:\s*"([^"]+)"', text)
print(f"Found {len(models)} models in seed_pumps.ts:")
for m in models:
    print(' -', m)

try:
    with open('C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/extracted_pumps_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"\nFound {len(data.get('pumps', []))} pumps in extracted_pumps_data.json")
    for p in data.get('pumps', []):
        print(f" - {p.get('model')} ({p.get('brand')})")
except Exception as e:
    print("Could not read extracted_pumps_data.json:", e)
