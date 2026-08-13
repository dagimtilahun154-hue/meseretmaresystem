import os
import pytesseract
from PIL import Image
import re

# Try setting tesseract cmd if found
possible_tess = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'C:\Users\new\AppData\Local\Tesseract-OCR\tesseract.exe'
]
for p in possible_tess:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        print("Using tesseract:", p)
        break

pages_dir = 'C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/scratch/difful_pages'
files = sorted([f for f in os.listdir(pages_dir) if f.endswith('.png')])

extracted_text = {}

for f in files:
    img_path = os.path.join(pages_dir, f)
    try:
        txt = pytesseract.image_to_string(Image.open(img_path))
        if txt.strip():
            extracted_text[f] = txt
            print(f"[{f}] Extracted {len(txt)} chars")
            print(txt[:300])
            print("="*40)
    except Exception as e:
        print(f"Error on {f}: {e}")
        break
