import fitz
import os

pdf_path = 'C:/Users/new/OneDrive/Documents/solarflow-manager-main/difful.pdf'
out_dir = 'C:/Users/new/OneDrive/Documents/solarflow-manager-main/solarflow-manager-main/scratch/difful_pages'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"Rendering {len(doc)} pages to {out_dir}...")

for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    out_path = os.path.join(out_dir, f"page_{i+1:02d}.png")
    pix.save(out_path)

print("All pages rendered to PNG successfully!")
