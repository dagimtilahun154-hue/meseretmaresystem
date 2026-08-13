import fitz

doc = fitz.open('C:/Users/new/OneDrive/Documents/solarflow-manager-main/difful.pdf')
print("Total pages:", len(doc))

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("text")
    blocks = page.get_text("blocks")
    words = page.get_text("words")
    images = page.get_images()
    print(f"Page {page_num+1}: text_len={len(text)}, blocks={len(blocks)}, words={len(words)}, images={len(images)}")
    if text.strip():
        print(f"   Sample text: {text[:200].strip()}")
