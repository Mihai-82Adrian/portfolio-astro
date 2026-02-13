---
name: format-lint
description: Formats Python code with black and lints with flake8+isort. Does NOT install tools — they must already be in venv. Use before commit or merge.
allowed-tools: ["Bash"]
---

# Preconditions

- venv exists with black, flake8, isort installed (from requirements.txt or requirements-dev.txt)
- If tools are missing, run `make setup` — do NOT pip install inside this skill

# Steps

## 1. Verify tools are available

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"
cd "$BACKEND"

MISSING=()
command -v black  > /dev/null 2>&1 || MISSING+=("black")
command -v flake8 > /dev/null 2>&1 || MISSING+=("flake8")
command -v isort  > /dev/null 2>&1 || MISSING+=("isort")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "FAIL: Missing tools: ${MISSING[*]}"
  echo "Fix: Add to requirements.txt or requirements-dev.txt, then run 'make setup'"
  exit 2
fi
echo "PASS: All lint tools available"
```

## 2. Sort imports with isort

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"
cd "$BACKEND"

isort . --profile black --skip venv --quiet
echo "PASS: Imports sorted (isort)"
```

## 3. Format code with black

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"
cd "$BACKEND"

black . --quiet --exclude venv
echo "PASS: Code formatted (black)"
```

## 4. Lint with flake8

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$ROOT/backend"
source "$BACKEND/venv/bin/activate"
cd "$BACKEND"

flake8 . --max-line-length=88 --exclude=venv,alembic,__pycache__ \
  --ignore=E203,W503 --count --show-source 2>&1

FLAKE8_EXIT=$?
if [ "$FLAKE8_EXIT" -eq 0 ]; then
  echo "PASS: No flake8 violations"
else
  echo "FAIL: flake8 found issues (see above)"
  exit 2
fi
```

## 5. (Optional) Quick all-in-one via Makefile

```bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

make lint
```

# Success Criteria

- isort reorders imports without errors
- black reformats without errors
- flake8 reports 0 violations (exit code 0)

# Failure Signatures

| Pattern | Cause | Fix |
|---------|-------|-----|
| `command not found: black` | Tool not in venv | Add to requirements-dev.txt, run `make setup` |
| flake8 F401 (unused import) | Dead import | Remove the import manually |
| flake8 F821 (undefined name) | Missing import or typo | Add import or fix name |
| flake8 E501 (line too long) after black | Non-code line (comment/string) | Break line or add `# noqa: E501` |

# Output Format

```
PASS: All lint tools available
PASS: Imports sorted (isort)
PASS: Code formatted (black)
PASS: No flake8 violations
```
