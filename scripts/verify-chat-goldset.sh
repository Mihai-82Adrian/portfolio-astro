#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8788}"
GOLDSET_FILE="${2:-docs/chat-goldset.json}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

fail=0
count=$(jq 'length' "$GOLDSET_FILE")
echo "Running goldset (${count} cases) against ${BASE_URL}/api/chat"

for idx in $(seq 0 $((count - 1))); do
  test_id=$(jq -r ".[$idx].id" "$GOLDSET_FILE")
  tab=$(jq -r ".[$idx].tab" "$GOLDSET_FILE")
  lang=$(jq -r ".[$idx].lang" "$GOLDSET_FILE")
  msg=$(jq -r ".[$idx].message" "$GOLDSET_FILE")
  intent=$(jq -r ".[$idx].intent // empty" "$GOLDSET_FILE")
  expect=$(jq -r ".[$idx].expect" "$GOLDSET_FILE")

  payload=$(jq -n --arg message "$msg" --arg lang "$lang" --arg tab "$tab" --arg intent "$intent" '
    if ($intent | length) > 0 then
      {message:$message, lang:$lang, tab:$tab, intent:$intent}
    else
      {message:$message, lang:$lang, tab:$tab}
    end
  ')

  headers_file=$(mktemp)
  body_file=$(mktemp)
  curl -sS -D "$headers_file" -o "$body_file" \
    -H 'content-type: application/json' \
    --data "$payload" \
    "$BASE_URL/api/chat"

  status=$(awk 'NR==1{print $2}' "$headers_file")
  ctype=$(awk 'BEGIN{IGNORECASE=1} /^content-type:/{print $2}' "$headers_file" | tr -d '\r')

  ok=1
  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    ok=0
  else
    case "$expect" in
      fact_json)
        if [[ "$ctype" != application/json* ]]; then ok=0; fi
        if [[ $ok -eq 1 ]]; then
          answer=$(jq -r '.answer // empty' "$body_file" 2>/dev/null || true)
          mode=$(jq -r '.mode // empty' "$body_file" 2>/dev/null || true)
          [[ "$mode" == "fact" ]] || ok=0
          must_count=$(jq ".[$idx].mustContain | length" "$GOLDSET_FILE")
          for m in $(seq 0 $((must_count - 1))); do
            needle=$(jq -r ".[$idx].mustContain[$m]" "$GOLDSET_FILE")
            echo "$answer" | rg -qi --fixed-strings "$needle" || ok=0
          done
        fi
        ;;
      jd_json)
        if [[ "$ctype" != application/json* ]]; then ok=0; fi
        if [[ $ok -eq 1 ]]; then
          jq -e '.answer' "$body_file" >/dev/null 2>&1 || ok=0
          answer=$(jq -r '.answer // empty' "$body_file" 2>/dev/null || true)
          echo "$answer" | rg -qi --fixed-strings 'score' || ok=0
          echo "$answer" | rg -qi --fixed-strings 'verdict' || ok=0
        fi
        ;;
      sse_stream)
        if [[ "$ctype" != text/event-stream* ]]; then ok=0; fi
        if [[ $ok -eq 1 ]]; then
          rg -q '^event: meta' "$body_file" || ok=0
          rg -q '^event: done' "$body_file" || ok=0
        fi
        ;;
      *)
        ok=0
        ;;
    esac
  fi

  if [[ $ok -eq 1 ]]; then
    echo "[PASS] $test_id"
  else
    echo "[FAIL] $test_id (status=$status ctype=$ctype expect=$expect)"
    fail=1
  fi

  rm -f "$headers_file" "$body_file"
done

exit $fail
