#!/usr/bin/env bash
# Post-deploy smoke test for a Firebase Hosting site + the shared backend.
#
# Checks the things GitHub Pages could never serve and that a broken
# backend deploy breaks first: locale pages, a dynamic-route rewrite, the
# security headers from firebase.json, the /api/forms/* function rewrites,
# and a callable. Each probe expects a specific status; 404/5xx fail.
#
# Usage: scripts/ci/smoke-test.sh <site-url> <functions-base-url>
#   e.g. scripts/ci/smoke-test.sh https://secid-mx.web.app \
#          https://us-central1-secid-org.cloudfunctions.net
set -uo pipefail

SITE="${1:?site url}"
FUNCTIONS="${2:?functions base url}"
FAILED=0

status() { # method url [data]
  local method="$1" url="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -sS -o /dev/null -w '%{http_code}' -X "$method" -H 'Content-Type: application/json' \
      --data "$data" --max-time 20 "$url" 2>/dev/null || echo 000
  else
    curl -sS -o /dev/null -w '%{http_code}' -X "$method" --max-time 20 "$url" 2>/dev/null || echo 000
  fi
}

expect() { # label method url expected-regex [data]
  local label="$1" method="$2" url="$3" want="$4" data="${5:-}"
  local got
  got=$(status "$method" "$url" "$data")
  if [[ "$got" =~ ^($want)$ ]]; then
    echo "ok   $label → $got"
  else
    echo "::error::FAIL $label → $got (expected $want) [$method $url]"
    FAILED=1
  fi
}

echo "## Hosting: $SITE"
expect "home"            GET "$SITE/"     200
expect "es locale"       GET "$SITE/es/"  200
expect "en locale"       GET "$SITE/en/"  200
# Dynamic route served through a firebase.json rewrite (404 on Pages).
expect "dynamic rewrite" GET "$SITE/es/dashboard/events/smoke-test-id" 200
# Function rewrites: GET is not allowed, but 405 proves the rewrite reached
# the function (404 would mean no rewrite / no function).
expect "contact rewrite"    GET "$SITE/api/forms/contact"    "405|400"
expect "newsletter rewrite" GET "$SITE/api/forms/newsletter" "405|400"

HEADERS=$(curl -sS -I --max-time 20 "$SITE/es/" 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]')
for h in x-content-type-options x-frame-options referrer-policy; do
  if grep -q "^$h:" <<<"$HEADERS"; then
    echo "ok   header $h"
  else
    echo "::error::FAIL missing security header $h on $SITE/es/"
    FAILED=1
  fi
done

echo "## Backend: $FUNCTIONS"
# A callable with an empty payload answers 400 (bad request) or 401; 404
# means not deployed, 5xx means the project/quota is broken (the 2026
# outages both showed up here first).
expect "completeRegistration callable" POST "$FUNCTIONS/completeRegistration" "400|401" '{"data":{}}'
expect "subscribeNewsletter"           GET  "$FUNCTIONS/subscribeNewsletter"  "405|400"

if [ "$FAILED" -ne 0 ]; then
  echo "Smoke test FAILED for $SITE"
  exit 1
fi
echo "Smoke test passed for $SITE"
