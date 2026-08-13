with open('C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/src/pages/PumpSizingPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'brands' in l.lower():
        print(f"{i+1}: {l.strip()}")
