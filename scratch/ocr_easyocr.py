import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

import easyocr
import json

reader = easyocr.Reader(['en'], verbose=False)
pages_dir = 'C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/scratch/difful_pages'
files = sorted([f for f in os.listdir(pages_dir) if f.endswith('.png')])

extracted = {}

for f in files:
    img_path = os.path.join(pages_dir, f)
    print(f"Processing {f}...")
    results = reader.readtext(img_path, detail=0)
    text = " ".join(results)
    extracted[f] = text
    print(f"[{f}] Extracted {len(results)} text blocks: {text[:150]}")

with open('scratch/difful_ocr_results.json', 'w', encoding='utf-8') as out:
    json.dump(extracted, out, indent=2, ensure_ascii=False)

print("Saved OCR results to scratch/difful_ocr_results.json")
