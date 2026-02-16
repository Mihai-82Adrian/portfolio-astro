
# Content Architect V2

The **Content Architect** skill provides automated quality gates and RAG-ready corpus generation for the portfolio content.

## Features

1. **Automated Audits**: Checks for structure, banned words, and metadata.
2. **RAG Corpus Export**: Deterministic, chunked JSONL export for AI indexing.
3. **Strict Mode**: Enforces zero-tolerance policy for CI/CD.

## Configuration

Configuration is located at `.agent/skills/content-architect/resources/content.config.json`.

```json
{
  "rules": {
    "requireExecutiveSummary": { "severity": "error" },
    "bannedWords": { "severity": "warning", "words": ["delve", "leverage"] },
    "requireOutlineFirst": { "severity": "warning" }
  }
}
```

## Usage

### Content Audit

Run the linter to check for issues:

```bash
npm run lint:content
```

**Strict Mode** (fails on warnings):

```bash
npm run lint:content -- --strict
```

**JSON Output** (for machine parsing):

```bash
npm run lint:content -- --format=json
```

### Corpus Policy (Freeze)

`public/corpus.jsonl` is frozen and must stay identical to `public/corpus-jsonl.txt`.
Automatic corpus export is disabled by policy and must not be reintroduced in CI/build hooks.

For corpus updates, edit the frozen source file intentionally and verify equality:

```bash
sha256sum public/corpus.jsonl public/corpus-jsonl.txt
```

Output Format (JSONL):

```json
{
  "id": "blog:en:post-slug:section-slug",
  "url": "/blog/post-slug#section-slug",
  "title": "Post Title",
  "sectionTitle": "Section Header",
  "text": "Content of the section...",
  "metadata": { ... }
}
```

### Manual PDF Evidence Workflow (Freeze-safe)

- Extract only verifiable text from source PDFs (example tools: `pdftotext`, `pdfinfo`).
- Add curated `evidence` entries manually to both:
  - `public/corpus.jsonl`
  - `public/corpus-jsonl.txt`
- Keep entries factual, concise, and traceable via `metadata.docPath`.
- If a PDF is image-only (scanned) and has no extractable text, do not invent details.
  - Mark it for manual OCR/human review in a future pass.
- After each update:

```bash
jq -c . public/corpus.jsonl >/dev/null
jq -c . public/corpus-jsonl.txt >/dev/null
sha256sum public/corpus.jsonl public/corpus-jsonl.txt
```

## Rules

| Rule | Description | Default Severity |
| :--- | :--- | :--- |
| `requireExecutiveSummary` | Must start with "Executive Summary", "BLUF", or "Introduction". | Error |
| `frontmatterRequiredFields` | strict schema validation for frontmatter. | Error |
| `languagePolicy` | Enforces `lang: en` for blog, allowlist for pages. | Error |
| `bannedWords` | Flags usage of corporate fluff words. | Warning |
| `requireOutlineFirst` | Long posts (>5k chars) must have a Table of Contents/Outline. | Warning |
| `requireDeepDiveElements` | Technical posts must have code blocks or diagrams. | Warning |
| `requireCitations` | Long posts must have links or citations. | Warning |

## CI Integration

The skill integrates with GitHub Actions via `npm run lint:content -- --strict`.
