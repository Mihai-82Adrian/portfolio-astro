# Corpus VLM Ingestion (Freeze-safe)

This guide defines how to extract text from scanned certificates/references with a VLM (Gemini, Mistral OCR, etc.) and transform it into our repository schema.

## 1) Documents that require VLM/OCR

The following files have poor or zero text extraction with `pdftotext`:

- `public/images/Arbeitszeugnis-Kesen-2025.pdf`
- `public/images/Arbeitszeugnis Mateescu.pdf`
- `public/images/Bescheid über Gleichwertigkeit - IHK.pdf`
- `public/images/IHK - Fachkraft für Buchführung.pdf`
- `public/images/IHK - Finanzbuchhaltung.pdf`
- `public/images/IHK - Lohn- und Gehaltsrechnung.pdf`
- `public/images/telc B2 Zertifikat Mateescu.pdf`
- `public/images/Zeugnis Mateescu_Quadriga.pdf` (partial extraction only)

## 2) Output contract

- Output must be valid JSONL only (one JSON object per line).
- Output schema must match `public/corpus.jsonl.example`.
- `metadata.source` must stay `manual-freeze`.
- Do not invent fields or facts. If unreadable, use `"<<" "UNREADABLE" ">>"` placeholders.
- Keep language variants for each item: `de`, `en`, `ro`.

## 3) Prompt template for VLM

Use this prompt with each scanned PDF (or image converted to PDF):

```text
You are extracting professional evidence data for a frozen JSONL corpus.

TASK
1) Read the attached document carefully.
2) Extract only explicit facts visible in the document.
3) Produce output as JSONL lines using the same schema and IDs as in corpus.jsonl.example.
4) Produce 3 language variants per item: de, en, ro.
5) Keep text concise, factual, and ATS-friendly.
6) If a value is unreadable, keep placeholder <<UNREADABLE>> instead of guessing.

STRICT RULES
- No markdown.
- No explanations.
- JSONL only.
- Preserve metadata.docPath exactly.
- Never hallucinate dates, scores, grades, or legal statements.
- Optimize for Vector Search: Ensure key industry entities (e.g., software names like DATEV, standards like GoBD, specific roles) are kept in their exact original spelling, even in the translated variants.
```

## 4) Freeze policy reminder

Never auto-write corpus in scripts/CI.
After manual curation, copy curated lines intentionally into both files:

- `public/corpus.jsonl`
- `public/corpus-jsonl.txt`

Then verify:

```bash
jq -c . public/corpus.jsonl >/dev/null
jq -c . public/corpus-jsonl.txt >/dev/null
sha256sum public/corpus.jsonl public/corpus-jsonl.txt
```
