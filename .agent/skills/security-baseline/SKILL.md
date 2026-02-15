---
name: security-baseline
description: Scans backend code for security issues — hardcoded secrets, raw SQL, unsafe deserialization, path traversal, and dependency CVEs. Two tiers available — quick (grep-based) and full (with bandit/pip-audit if installed).
allowed-tools: ["Bash", "Read", "Grep"]
---

# Preconditions

- Backend code accessible
- For full tier: bandit and/or pip-audit installed in venv (optional)

# Steps

## Tier: Quick (always available, grep-based)

### 1. Hardcoded secrets

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"

echo "=== Hardcoded secrets ==="
HITS=$(grep -rn \
  --include="*.py" \
  --exclude-dir=venv \
  --exclude-dir=__pycache__ \
  --exclude-dir=.git \
  -iE "(password|api_key|secret|token)\s*=\s*['\"][^'\"]+['\"]" \
  "$ROOT/backend/" 2>/dev/null | grep -v "test_\|#\|getenv\|environ" || true)

if [ -n "$HITS" ]; then
  echo "FAIL: Possible hardcoded secrets:"
  echo "$HITS"
else
  echo "PASS: No hardcoded secrets detected"
fi
```

### 2. Raw SQL / injection risk

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"

echo "=== SQL injection risk ==="
HITS=$(grep -rn \
  --include="*.py" \
  --exclude-dir=venv \
  -E "\.execute\(f\"|\.execute\(f'" \
  "$ROOT/backend/" 2>/dev/null || true)

if [ -n "$HITS" ]; then
  echo "FAIL: f-string in .execute() — SQL injection risk:"
  echo "$HITS"
else
  echo "PASS: No raw SQL concatenation found"
fi
```

### 3. Unsafe deserialization

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"

echo "=== Unsafe deserialization ==="
HITS=$(grep -rn \
  --include="*.py" \
  --exclude-dir=venv \
  -E "pickle\.(loads|load)\b|eval\(|exec\(" \
  "$ROOT/backend/" 2>/dev/null | grep -v "test_\|#" || true)

if [ -n "$HITS" ]; then
  echo "FAIL: Unsafe deserialization detected:"
  echo "$HITS"
else
  echo "PASS: No pickle/eval/exec in production code"
fi
```

### 4. Path traversal in file operations

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"

echo "=== Path traversal risk ==="
# Check if any open() calls use user-supplied input without basename/validation
HITS=$(grep -rn \
  --include="*.py" \
  --exclude-dir=venv \
  -E "open\(.*request\.|open\(.*file_path" \
  "$ROOT/backend/" 2>/dev/null | grep -v "test_\|#" || true)

if [ -n "$HITS" ]; then
  echo "WARN: File open with potential user input — verify path validation:"
  echo "$HITS"
else
  echo "PASS: No obvious path traversal risk"
fi
```

### 5. Information leakage in error handling

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"

echo "=== Error info leakage ==="
HITS=$(grep -rn \
  --include="*.py" \
  --exclude-dir=venv \
  -E "return.*str\(e\)|\"error\".*str\(e\)" \
  "$ROOT/backend/" 2>/dev/null | grep -v "test_\|#" || true)

if [ -n "$HITS" ]; then
  echo "WARN: Exception details may leak to client:"
  echo "$HITS"
else
  echo "PASS: No obvious info leakage"
fi
```

## Tier: Full (requires bandit / pip-audit in venv)

### 6. Static analysis with bandit (if available)

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"

if command -v bandit > /dev/null 2>&1; then
  echo "=== Bandit static analysis ==="
  bandit -r "$BACKEND" \
    --exclude "$BACKEND/venv,$BACKEND/alembic" \
    -ll --format txt 2>&1 || true
else
  echo "SKIP: bandit not installed (optional — add to requirements-dev.txt)"
fi
```

### 7. Dependency CVE audit (if available)

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"

if command -v pip-audit > /dev/null 2>&1; then
  echo "=== pip-audit CVE scan ==="
  pip-audit --desc 2>&1 || true
elif command -v safety > /dev/null 2>&1; then
  echo "=== safety CVE scan ==="
  safety check 2>&1 || true
else
  echo "SKIP: Neither pip-audit nor safety installed (optional)"
fi
```

# Success Criteria

**Quick tier (blocking):**
- No hardcoded secrets
- No raw SQL concatenation (f-strings in .execute())
- No pickle/eval/exec in production code

**Full tier (informational unless Critical):**
- bandit reports no High/Critical
- pip-audit reports no known CVEs

# Failure Signatures

| Finding | Severity | Action |
|---------|----------|--------|
| Hardcoded secret in code | CRITICAL | Move to .env, read via os.getenv() |
| f-string SQL | CRITICAL | Use text() with bound params |
| pickle.loads() | CRITICAL | Replace with json.loads() + Pydantic |
| eval()/exec() | CRITICAL | Remove; use safe alternatives |
| Path traversal risk | HIGH | Add os.path.basename() + abspath check |
| Error leaking str(e) | MEDIUM | Log internally, return generic message |
| Dependency CVE (Critical) | HIGH | Upgrade package |
| Dependency CVE (Low) | LOW | Schedule upgrade |

# Output Format

```
=== Quick Tier ===
PASS: No hardcoded secrets detected
PASS: No raw SQL concatenation found
PASS: No pickle/eval/exec in production code
PASS: No obvious path traversal risk
PASS: No obvious info leakage

=== Full Tier ===
PASS: bandit — no High/Critical findings
PASS: pip-audit — 0 known vulnerabilities
```
