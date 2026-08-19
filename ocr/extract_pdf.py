import pymupdf, json, sys, os

# ============================================================
# Trích xuất text layer + FreeText annotations từ PDF
# (VPBank loan application - dữ liệu điền nằm trong FreeText annotations)
# Usage: python extract_pdf.py <input.pdf> [output.json]
# ============================================================

def extract_pdf(pdf_path, out_path):
    doc = pymupdf.open(pdf_path)
    pages_out = []
    for pno, page in enumerate(doc):
        annots = []
        for a in page.annots() or []:
            if a.type[0] == 2:  # FreeText
                annots.append({
                    "rect": [round(x, 1) for x in a.rect],
                    "content": (a.info.get("content", "") or "").strip(),
                })
        words = page.get_text("words")
        text_items = [{
            "x0": round(w[0], 1), "y0": round(w[1], 1),
            "x1": round(w[2], 1), "y1": round(w[3], 1),
            "text": w[4],
        } for w in words]
        pages_out.append({
            "page": pno + 1,
            "annotations": sorted(annots, key=lambda a: (a["rect"][1], a["rect"][0])),
            "text_words": text_items,
        })
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(pages_out, f, ensure_ascii=False, indent=1)
    return pages_out

if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else "input.pdf"
    out = sys.argv[2] if len(sys.argv) > 2 else "pdf_content.json"
    pages = extract_pdf(pdf, out)
    print("pages:", len(pages))
    for p in pages:
        print(f"page {p['page']}: {len(p['annotations'])} annotations, {len(p['text_words'])} words")
    print("written ->", out)
