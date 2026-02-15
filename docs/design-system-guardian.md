# Design System Guardian

The **Design System Guardian** is a strict linter/audit tool that enforces the project's design system tokens and rules. It prevents "magic numbers", hardcoded hex values, and arbitrary constraints, ensuring the UI remains consistent and premium.

## 🛡️ Key Features

- **Token Enforcement**: Flags hardcoded hex values (`#123456`) and suggests the nearest design token from `design-tokens.json`.
- **Arbitrary Value Prevention**: Blocks Tailwind arbitrary values like `w-[357px]` or `z-[9999]` unless explicitly allowlisted.
- **Strict Spacing**: Enforces the standard spacing scale (bans magic values like `p-7`).
- **Configuration-Driven**: Rules, includes/excludes, and severity levels are defined in `resources/audit.config.json`.
- **CI/CD Integration**: wired into GitHub Actions to block non-compliant PRs.

## 🚀 How to Run

### Standard Audit

Runs the audit and reports violations. Exit code 1 if **errors** are found (warnings allowed).

```bash
npm run lint:design-system
```

### Strict Mode

Exit code 1 if **any** violation (error OR warning) is found. Used in CI.

```bash
npm run lint:design-system:strict
```

### JSON Output

Outputs machine-readable JSON for tooling/CI pipelines.

```bash
npm run lint:design-system:json
```

## ⚙️ Configuration

The configuration lives in `.agent/skills/design-system-guardian/resources/audit.config.json`.

### Structure

```json
{
  "includeGlobs": ["src/**/*.{astro,ts,tsx,css}"],
  "excludeGlobs": ["dist/**", "node_modules/**"],
  "allowedFilesWithHex": ["tailwind.config.mjs"],
  "rules": {
    "noHardcodedHex": { "severity": "error", "suggestToken": true },
    "noArbitraryValues": { "severity": "warning", "allow": ["^bg-\\[url\\(.*?\\)\\]$"] },
    "bannedSpacingScale": { "severity": "warning", "ban": ["7"] }
  }
}
```

### Rules

| Rule | Description |
|------|-------------|
| `noHardcodedHex` | Flags `#123456`. Suggests nearest token. |
| `noInlineStyleHex` | Flags hex in `style="..."` attributes. |
| `noArbitraryValues` | Flags `w-[123px]`. Use `w-32` or tokens instead. |
| `noArbitraryZIndex` | Flags `z-[12]`. Allowed: `z-0` to `z-50`. |
| `bannedSpacingScale` | Flags `p-7`, `m-7`. Use standard scale (4, 8, etc.). |
| `disallowNonSystemColors` | (Coming Soon) Flags default Tailwind colors not in theme. |

## 🛠️ Extending & Suppressing

### Allowlisting

To allow a specific arbitrary pattern (e.g., dynamic grid cols), add a regex to the `allow` array in `audit.config.json`:

```json
"noArbitraryValues": {
  "allow": ["^grid-cols-\\[.*\\]$"]
}
```

### Suppressing violations

Currently, you must allowlist the file or fix the issue. Line-level suppression comments (e.g. `// audit-ignore`) are planned for V3.

## ✅ Pre-Commit Hook (Recommended)

To run the guardian on every commit (only on staged files), set up `lint-staged`:

1. Install: `npm install --save-dev husky lint-staged`
2. Init: `npx husky init`
3. Add to `package.json`:

    ```json
    "lint-staged": {
      "src/**/*.{astro,ts,tsx,css}": ["npm run lint:design-system --"]
    }
    ```
