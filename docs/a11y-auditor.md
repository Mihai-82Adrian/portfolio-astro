
# Accessibility Auditor (V2)

The `a11y-auditor` skill enforces accessibility best practices using static analysis (source scan) and post-build structure checks (dist scan). It is designed to run in CI environments to prevent regressions.

## Features

- **Source Scan**: Analyzes source files (`.astro`, `.html`, `.md`, `.tsx`) for common issues like missing `alt` text, empty links, and icon-only buttons without labels. It uses `node-html-parser` for robust AST-based verification.
- **Dist Scan**: specific checks against the built HTML (`dist/`) to ensure valid document structure (`lang` attribute, `<main>` landmark, unique `<h1>`, heading order).
- **Configuration-Driven**: All rules and allowlists are defined in `.agent/skills/a11y-auditor/resources/a11y.config.json`.
- **Strict Mode**: CI runs in strict mode, treating warnings as errors.

## Usage

### Run Locally

```bash
# Run both source and dist scans (default)
npm run lint:a11y

# Run in strict mode (fails on warnings)
npm run lint:a11y:strict
```

### Configuration

The configuration file is located at `.agent/skills/a11y-auditor/resources/a11y.config.json`.

**Example:**

```json
{
  "rules": {
    "source": { "img-alt": { "severity": "error" } }
  },
  "allowlists": {
    "img-alt": [
      { "file": "src/components/Decorative.astro", "reason": "Purely decorative" }
    ]
  }
}
```

## Rules

### Source Rules

- `img-alt`: `<img>` tags must have an `alt` attribute.
- `button-name`: `<button>` tags must have text content or `aria-label`/`title`.
- `link-name`: `<a>` tags must have text content or `aria-label`/`title`.
- `interactive-handlers`: Non-interactive elements (`div`, `span`) with `onClick` handlers must have `role` or `tabindex`.

### Dist Rules

- `html-lang`: `<html>` tag must have a `lang` attribute.
- `main-landmark`: Page must have a `<main>` tag.
- `unique-h1`: Page must have exactly one `<h1>`.
- `unique-ids`: No duplicate `id` attributes on the page.
- `heading-order`: Headings should not skip levels (e.g., H1 -> H3).

## Adding Exceptions

To add an exception, edit `resources/a11y.config.json` and add an entry to the `allowlists` object under the relevant rule ID. You can match by `file` (regex) or `regex` (content match).
