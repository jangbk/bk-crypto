#!/usr/bin/env bash
# P1-2.5 member-auth smoke test (bk-crypto).
# Prereqs (Ken):
#   1. supabase/001_init.sql run in the bk-invest Supabase project.
#   2. .env.local has NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + AUTH_HMAC_SECRET.
#   3. `npm run dev` running in another terminal (http://localhost:3000).
#
# Usage: bash scripts/smoke-auth.sh
set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
COOKIE="$(mktemp)"
PASS="test1234"
A_EMAIL="ken@test.local"
B_EMAIL="test2@test.local"
ok=0; fail=0
chk() { if [ "$1" = "$2" ]; then echo "  ✅ $3"; ok=$((ok+1)); else echo "  ❌ $3 (got '$1', want '$2')"; fail=$((fail+1)); fi; }

echo "== 1) bootstrap signup (expect bootstrap:true) =="
r=$(curl -sS -X POST "$BASE/api/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"Ken\",\"phone\":\"010-0000-0000\",\"email\":\"$A_EMAIL\",\"password\":\"$PASS\",\"note\":\"bootstrap\"}")
echo "  $r"; chk "$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("bootstrap"))' 2>/dev/null)" "True" "first user is bootstrap admin"

echo "== 2) login (expect ok + role admin) =="
r=$(curl -sS -X POST "$BASE/api/login" -H "Content-Type: application/json" -c "$COOKIE" \
  -d "{\"email\":\"$A_EMAIL\",\"password\":\"$PASS\"}")
echo "  $r"; chk "$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("user",{}).get("role"))' 2>/dev/null)" "admin" "admin login"

echo "== 3) /api/me (expect status active) =="
r=$(curl -sS "$BASE/api/me" -b "$COOKIE")
echo "  $r"; chk "$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("user",{}).get("status"))' 2>/dev/null)" "active" "session resolves to active admin"

echo "== 4) second signup (expect bootstrap:false) =="
r=$(curl -sS -X POST "$BASE/api/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"Tester\",\"phone\":\"010-1111-1111\",\"email\":\"$B_EMAIL\",\"password\":\"$PASS\"}")
echo "  $r"; chk "$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("bootstrap"))' 2>/dev/null)" "False" "second user is pending"

echo "== 5) second login (expect 403 pending) =="
code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$B_EMAIL\",\"password\":\"$PASS\"}")
chk "$code" "403" "pending user blocked at login"

echo "== 6) admin lists users + approves second =="
r=$(curl -sS "$BASE/api/admin/users" -b "$COOKIE")
B_ID=$(echo "$r" | python3 -c "import sys,json;u=[x for x in json.load(sys.stdin).get('users',[]) if x.get('email')=='$B_EMAIL'];print(u[0]['id'] if u else '')" 2>/dev/null)
echo "  users listed; test2 id=$B_ID"
chk "$([ -n "$B_ID" ] && echo found || echo missing)" "found" "admin can list users"
if [ -n "$B_ID" ]; then
  r=$(curl -sS -X PATCH "$BASE/api/admin/users/$B_ID" -b "$COOKIE" -H "Content-Type: application/json" -d '{"status":"active"}')
  echo "  $r"; chk "$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("user",{}).get("status"))' 2>/dev/null)" "active" "admin approves second user"
  echo "== 7) second login after approval (expect 200) =="
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$B_EMAIL\",\"password\":\"$PASS\"}")
  chk "$code" "200" "approved user can log in"
fi

rm -f "$COOKIE"
echo ""
echo "== RESULT: $ok passed, $fail failed =="
[ "$fail" -eq 0 ]
