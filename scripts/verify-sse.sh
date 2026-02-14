#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8788}"
TMP_DIR="$(mktemp -d)"
HEADERS_FILE="$TMP_DIR/headers.txt"
BODY_FILE="$TMP_DIR/body.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

printf 'Verifying SSE endpoint at %s/api/chat\n' "$BASE_URL"

curl -sS -N \
  -D "$HEADERS_FILE" \
  -H 'content-type: application/json' \
  -H 'x-cookie-consent: granted' \
  --max-time 30 \
  --data '{"message":"Give a concise summary of Mihai profile in one paragraph.","tab":"chat","lang":"en"}' \
  "$BASE_URL/api/chat" > "$BODY_FILE"

if ! rg -qi '^content-type:\s*text/event-stream' "$HEADERS_FILE"; then
  echo 'FAIL: Content-Type is not text/event-stream'
  echo '--- headers ---'
  cat "$HEADERS_FILE"
  exit 1
fi

if ! rg -qi '^cache-control:.*no-store' "$HEADERS_FILE"; then
  echo 'FAIL: Cache-Control does not include no-store'
  echo '--- headers ---'
  cat "$HEADERS_FILE"
  exit 1
fi

if ! rg -qi '^vary:.*x-cookie-consent' "$HEADERS_FILE"; then
  echo 'FAIL: Vary header does not include X-Cookie-Consent'
  echo '--- headers ---'
  cat "$HEADERS_FILE"
  exit 1
fi

if ! rg -q 'event: meta' "$BODY_FILE"; then
  echo 'FAIL: missing event: meta marker'
  exit 1
fi

if ! rg -q 'event: done' "$BODY_FILE"; then
  echo 'FAIL: missing event: done marker'
  exit 1
fi

if ! rg -q 'event: delta' "$BODY_FILE"; then
  echo 'WARN: event: delta not observed (possible fallback/no-token case)'
fi

echo 'PASS: SSE headers and event markers verified'
