import json, re, requests, time, os, sys

# ============================================================
# Gọi Groq LLM để ánh xạ giá trị đã điền (từ FreeText annotations)
# vào các trường (schema.json xác định từ file docx biểu mẫu).
#
# Usage:
#   1) python extract_pdf.py  <filled.pdf>  pdf_content.json
#   2) set GROQ_API_KEY=<gsk_...>
#   3) python extract_groq.py
#
# Output: groq_result.json (65+ fields, kèm trace theo trang)
# ============================================================

URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.json")
PDF_CONTENT_PATH = os.path.join(BASE_DIR, "pdf_content.json")
RESULT_PATH = os.path.join(BASE_DIR, "groq_result.json")

API_KEY = os.environ.get("GROQ_API_KEY")
if not API_KEY:
    sys.exit("Thiếu biến môi trường GROQ_API_KEY")

schema = json.load(open(SCHEMA_PATH, encoding="utf-8"))
pdf_content = json.load(open(PDF_CONTENT_PATH, encoding="utf-8"))

# Trang -> các section liên quan (theo bố cục biểu mẫu VPBank)
PAGE_SECTIONS = {
    1: ["muc_dich_vay", "thong_tin_phap_ly"],
    2: ["hoat_dong_sxkd", "quan_he_tctd"],
    3: ["tai_chinh_tai_san", "phuong_an_von", "de_nghi_cap_tin_dung"],
    4: ["tsbd"],
    5: ["nguoi_lien_he", "the_tin_dung"],
    6: ["vpbank_online", "fatca"],
    9: ["nguoi_bao_lanh"],
    10: ["phan_ngan_hang"],
}

def build_section_text(section_ids):
    lines = []
    for sec in schema["sections"]:
        if sec["id"] in section_ids:
            lines.append(f"## {sec['title']}")
            for f in sec["fields"]:
                if f["type"] == "checkbox":
                    lines.append(f"- {f['key']} : {f['label']} [chon 1 trong: {', '.join(f['options'])}]")
                elif f["type"] == "table":
                    lines.append(f"- {f['key']} : {f['label']} [bang - cot: {', '.join(f['columns'])}]")
                else:
                    lines.append(f"- {f['key']} : {f['label']}")
    return "\n".join(lines)

def reconstruct_page(page):
    items = []
    for w in page["text_words"]:
        items.append((round((w["y0"] + w["y1"]) / 2), w["x0"], "label", w["text"]))
    for a in page["annotations"]:
        r = a["rect"]
        items.append((round((r[1] + r[3]) / 2), r[0], "value", a["content"]))
    items.sort(key=lambda t: (t[0], t[1]))
    lines, cur, last_y = [], [], None
    for yc, x, kind, text in items:
        if last_y is None or abs(yc - last_y) <= 9:
            cur.append((x, kind, text))
            last_y = yc if last_y is None else (last_y + yc) / 2
        else:
            lines.append(cur); cur = [(x, kind, text)]; last_y = yc
    if cur:
        lines.append(cur)
    out = []
    for ln in lines:
        ln.sort(key=lambda t: t[0])
        out.append(" ".join(f"[{t}]" if k == "value" else t for x, k, t in ln))
    return "\n".join(out)

def call_groq(prompt, max_tokens=3000):
    for attempt in range(6):
        try:
            r = requests.post(URL,
                headers={"Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"},
                json={"model": MODEL, "messages": [{"role": "user", "content": prompt}],
                      "max_tokens": max_tokens, "temperature": 0},
                timeout=180)
            j = r.json()
            if "choices" in j and j["choices"]:
                return j["choices"][0]["message"].get("content", "")
            err = j.get("error", {})
            msg = err.get("message", "")
            if "Rate limit" in msg:
                m = re.search(r"try again in ([\d.]+)s", msg)
                wait = float(m.group(1)) + 1 if m else 15
                print(f"    rate-limit, sleep {wait:.0f}s")
                time.sleep(wait)
                continue
            print("  groq error:", msg[:300])
            return ""
        except Exception as e:
            print("  attempt", attempt, "error:", e)
            time.sleep(10)
    return ""

def extract_json(text):
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None

final = {"model": MODEL, "schema_file": "schema.json", "fields": {}, "pages": []}

for page in pdf_content:
    pno = page["page"]
    if not page["annotations"]:
        continue
    section_ids = PAGE_SECTIONS.get(pno)
    if not section_ids:
        continue
    recon = reconstruct_page(page)
    section_text = build_section_text(section_ids)
    prompt = f"""Bạn là hệ thống trích xuất dữ liệu hồ sơ vay vốn.

Danh sách TRƯỜNG cần trích (chỉ dùng các key này):
{section_text}

Nội dung TRANG {pno} (giá trị đã điền nằm trong ngoặc vuông [ ]):
---
{recon}
---

Nhiệm vụ: trích các giá trị ĐÃ ĐIỀN trên trang và gán vào đúng key.
- CHỈ trả về một JSON object, không giải thích, không markdown.
- Key phải khớp đúng key trong danh sách trường.
- Bỏ qua trường trống / không có giá trị trên trang này.
- Checkbox: ghi đúng tên lựa chọn được đánh dấu X.
- Số: giữ dạng số, bỏ dấu phẩy và đơn vị.
- Table: nếu có nhiều dòng thì gộp thành danh sách (array of objects theo cột)."""
    print(f"== Page {pno} ({len(page['annotations'])} values) -> sections {section_ids}")
    raw = call_groq(prompt)
    data = extract_json(raw)
    if isinstance(data, dict):
        final["pages"].append({"page": pno, "sections": section_ids, "extracted": data})
        for k, v in data.items():
            if v not in (None, "", []):
                final["fields"][k] = v
        print(f"    ok: {len(data)} fields")
    else:
        print(f"    !! parse fail, raw: {raw[:200]!r}")
        final["pages"].append({"page": pno, "extracted": None, "raw": raw[:800]})
    time.sleep(2)

with open(RESULT_PATH, "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=2)
print("\nDONE ->", RESULT_PATH)
print("total fields extracted:", len(final["fields"]))
