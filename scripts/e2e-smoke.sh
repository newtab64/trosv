#!/usr/bin/env bash
# ============================================================
# TROSV E2E smoke test - exercises every API call the
# frontend makes, page by page, in the order a user clicking
# through the app would trigger them (docs/contracts/API_CONTRACT.md).
#
# Usage:
#   bash scripts/e2e-smoke.sh
#   API=http://other-host:8000/api bash scripts/e2e-smoke.sh
#   DEBUG=1 bash scripts/e2e-smoke.sh     # show raw responses
#
# Requires:
#   - curl + jq
#   - Backend running AND seeded on :8000:
#       cd apps/api && php artisan serve
#     (DB setup: see the repo README - migrate:fresh --seed)
#
# Notes:
#   - The AI service is NOT required: the suite accepts both
#     "AI down → 503 fallback" and "AI up → real data".
#   - Re-runnable: registers a fresh unique account each run
#     and deletes its landlord fixture listings at the end.
# ============================================================
set -u
API="${API:-http://127.0.0.1:8000/api}"
API_ORIGIN="$(echo "$API" | sed -E 's#^([a-zA-Z]+://[^/]+).*#\1#')"
AI_URL="${AI_URL:-http://127.0.0.1:8001}"
AJ='-H Accept:application/json'
PASS=0; FAIL=0

command -v curl >/dev/null || { echo "curl is required"; exit 1; }
command -v jq   >/dev/null || { echo "jq is required";   exit 1; }

ok(){   PASS=$((PASS+1)); echo "  PASS $1"; }
bad(){  FAIL=$((FAIL+1)); echo "  FAIL $1  ->  $2"; }
check(){ local name="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then ok "$name"; else bad "$name" "expected=[$expected] got=[$actual]"; fi; }
JQ(){ echo "$1" | jq -r "$2" 2>/dev/null; }
DBG(){ [[ "${DEBUG:-0}" == "1" ]] && echo "  [raw] $1" >&2; return 0; }

# --- request helpers (token as first arg; NO* = guest) ---
GET(){  curl -s $AJ -H "Authorization: Bearer $1" "$2"; }
POST(){ curl -s $AJ -H Content-Type:application/json -X POST -H "Authorization: Bearer $1" -d "$3" "$2"; }
PUT(){  curl -s $AJ -H Content-Type:application/json -X PUT  -H "Authorization: Bearer $1" -d "$3" "$2"; }
DEL(){  curl -s $AJ -X DELETE -H "Authorization: Bearer $1" "$2"; }
POSTF(){ local t="$1" url="$2"; shift 2; curl -s $AJ -X POST -H "Authorization: Bearer $t" "$@" "$url"; }
NOGET(){  curl -s $AJ "$1"; }
NOPOST(){ curl -s $AJ -H Content-Type:application/json -X POST -d "$2" "$1"; }

# AI endpoints: pass if 503 fallback message OR real data came back.
check_ai(){ local name="$1" json="$2" msg
  msg=$(JQ "$json" '.message')
  if [[ "$msg" == "Dịch vụ AI tạm thời không khả dụng." ]] || [[ "$(JQ "$json" '.data != null')" == "true" ]]; then
    ok "$name"
  else
    bad "$name" "expected 503 fallback or data; got: $(echo "$json" | head -c 160)"
  fi; }

# --- preflight ---
if ! curl -s -m 3 -o /dev/null "$API/listings?per_page=1"; then
  echo "✗ Backend not reachable at $API"
  echo "  Start it:   cd apps/api && php artisan serve"
  echo "  Or docker:  docker compose up -d --build backend"
  echo "  Elsewhere:  API=http://host:8000/api bash scripts/e2e-smoke.sh"
  exit 1
fi
AI_UP=false
curl -s -m 2 "$AI_URL/health" 2>/dev/null | grep -q ok && AI_UP=true
echo "Backend: $API  |  AI service: $([[ $AI_UP == true ]] && echo RUNNING || echo not running - 503 fallback asserted)"
echo ""

E2E_EMAIL="sv-e2e-$(date +%s)$RANDOM@example.com"

echo "=== GUEST: Home page (GET /listings newest 6) ==="
R=$(NOGET "$API/listings?per_page=6&sort=newest"); DBG "$R"
check "home listings 200" "$(JQ "$R" '.data|type')" "array"
check "home per_page honored" "$(JQ "$R" '.meta.per_page')" "6"
LID=$(JQ "$R" '.data[0].id')
echo "  (listing id used for detail/chat/review: $LID)"

echo "=== GUEST: Rooms page (sidebar filters) ==="
R=$(NOGET "$API/listings?type=room&price_min=1000000&price_max=4000000&sort=price_asc&page=1"); DBG "$R"
check "filter type+price+sort" "$(JQ "$R" '.data|type')" "array"
R=$(NOGET "$API/listings?q=ph%C3%B2ng&sort=rating"); DBG "$R"
check "search q + rating sort" "$(JQ "$R" '.data|type')" "array"
WARD=$(JQ "$(NOGET "$API/wards")" '.data[0].id')
R=$(NOGET "$API/listings?ward_id=$WARD"); DBG "$R"
check "ward filter" "$(JQ "$R" '.data|type')" "array"
AM=$(JQ "$(NOGET "$API/amenities")" '.data[0].id')
R=$(NOGET "$API/listings?amenity_ids[]=$AM"); DBG "$R"
check "amenity filter" "$(JQ "$R" '.data|type')" "array"

# Cascade dia ly: City -> Ward/School (34 don vi cap tinh, NQ 202/2025/QH15).
R=$(NOGET "$API/cities"); DBG "$R"
check "cities list >=34" "$([[ $(JQ "$R" '.data|length') -ge 34 ]] && echo true)" "true"
check "cities sorted A-Z (first)" "$(JQ "$R" '.data[0].name')" "An Giang"
CITY=$(JQ "$(NOGET "$API/cities")" '.data[]|select(.name=="TP.HCM")|.id')
R=$(NOGET "$API/wards?city_id=$CITY"); DBG "$R"
check "wards filter by city" "$(JQ "$R" "[.data[]|select(.city.id != $CITY)]|length")" "0"
R=$(NOGET "$API/schools?city_id=$CITY"); DBG "$R"
check "schools filter by city" "$(JQ "$R" "[.data[]|select(.city.id != $CITY)]|length")" "0"
R=$(NOGET "$API/listings?city_id=$CITY&per_page=50"); DBG "$R"
check "listings filter by city_id" "$(JQ "$R" '.data|type')" "array"
SCHOOL=$(JQ "$(NOGET "$API/schools")" '.data[0].id')
R=$(NOGET "$API/listings?school_id=$SCHOOL&max_km=3&sort=distance"); DBG "$R"
check "near-school filter (distance_km)" "$(JQ "$R" '.data[0].distance_km != null')" "true"
R=$(NOGET "$API/listings?max_km=3"); DBG "$R"
check "max_km w/o school_id -> 422 msg" "$(JQ "$R" '.message != null')" "true"

echo "=== GUEST: Room detail + reviews (RoomDetail page) ==="
R=$(NOGET "$API/listings/$LID"); DBG "$R"
check "detail has landlord" "$(JQ "$R" '.data.landlord.name != null')" "true"
check "guest phone hidden" "$(JQ "$R" '.data.landlord.phone')" "null"
check "detail has ratings obj" "$(JQ "$R" '.data.ratings|type')" "object"
R=$(NOGET "$API/listings/$LID/reviews"); DBG "$R"
check "reviews list 200" "$(JQ "$R" '.data|type')" "array"
R=$(NOGET "$API/listings/999999"); DBG "$R"
check "missing listing -> 404 json" "$(JQ "$R" '.message')" "Không tìm thấy dữ liệu."

echo "=== AUTH: bad login then real login (Login page) ==="
R=$(NOPOST "$API/login" '{"email":"student1@example.com","password":"wrong"}'); DBG "$R"
check "bad login 422 + errors.email" "$(JQ "$R" '.errors.email[0] != null')" "true"
R=$(NOPOST "$API/login" '{"email":"student1@example.com","password":"password"}'); DBG "$R"
STOKEN=$(JQ "$R" '.data.token')
if [[ ${#STOKEN} -lt 20 ]]; then
  echo "✗ student1 login failed - is the DB seeded? (php artisan migrate:fresh --seed)"
  exit 1
fi
ok "student login token"

R=$(GET "$STOKEN" "$API/me")
check "GET /me role" "$(JQ "$R" '.data.role')" "student"

echo "=== REGISTER: new student account (Register page) ==="
R=$(NOPOST "$API/register" "{\"name\":\"Test SV\",\"email\":\"$E2E_EMAIL\",\"password\":\"password123\",\"password_confirmation\":\"password123\",\"role\":\"student\"}"); DBG "$R"
TTOKEN=$(JQ "$R" '.data.token')
check "register auto-login role" "$(JQ "$R" '.data.user.role')" "student"
R=$(NOPOST "$API/register" "{\"name\":\"Dup\",\"email\":\"$E2E_EMAIL\",\"password\":\"password123\",\"password_confirmation\":\"password123\",\"role\":\"student\"}"); DBG "$R"
check "duplicate email -> 422" "$(JQ "$R" '.message != null')" "true"

echo "=== STUDENT: Profile page (PUT /profile) ==="
R=$(PUT "$TTOKEN" "$API/profile" "{\"name\":\"Test SV K9\",\"school_id\":$SCHOOL,\"budget_min\":1200000,\"budget_max\":3000000,\"sleep_schedule\":\"normal\",\"cleanliness\":4,\"smoking\":false,\"personality\":\"introvert\",\"interests\":\"music,gym\",\"looking_for_roommate\":true}"); DBG "$R"
check "profile update saved" "$(JQ "$R" '.data.name')" "Test SV K9"
R=$(PUT "$TTOKEN" "$API/profile" '{"budget_min":5000000,"budget_max":1000000}'); DBG "$R"
check "budget max<min -> 422" "$(JQ "$R" '.message != null')" "true"

echo "=== STUDENT: Favorites (hearts + Favorites page) ==="
R=$(GET "$TTOKEN" "$API/favorites"); DBG "$R"
BASE_FAV=$(JQ "$R" '.data|length')
check "favorites starts empty" "$BASE_FAV" "0"
R=$(PUT "$TTOKEN" "$API/favorites/$LID" '{}'); DBG "$R"
check "PUT favorite true" "$(JQ "$R" '.data.is_favorited')" "true"
R=$(PUT "$TTOKEN" "$API/favorites/$LID" '{}'); DBG "$R"
check "PUT favorite idempotent" "$(JQ "$R" '.data.is_favorited')" "true"
R=$(GET "$TTOKEN" "$API/listings?per_page=50"); DBG "$R"
check "is_favorited personalized" "$(JQ "$R" "[.data[]|select(.id==$LID)][0].is_favorited")" "true"
R=$(GET "$TTOKEN" "$API/favorites"); DBG "$R"
check "favorites page +1" "$(JQ "$R" '.data|length')" "$((BASE_FAV+1))"

echo "=== STUDENT: Messaging (chat button + Messages pages) ==="
# Conversation step: pick a listing belonging to landlord1 (instead of sort=newest) so landlord1 owns it
LTOKEN=$(JQ "$(NOPOST "$API/login" '{"email":"landlord1@example.com","password":"password"}')" '.data.token')
LID=$(JQ "$(GET "$LTOKEN" "$API/my/listings")" '.data[0].id')
R=$(POST "$TTOKEN" "$API/conversations" "{\"listing_id\":$LID}"); DBG "$R"
CONV=$(JQ "$R" '.data.id')
check "conversation created w/ listing" "$(JQ "$R" '.data.listing.id')" "$LID"
R=$(POST "$TTOKEN" "$API/conversations" "{\"listing_id\":$LID}"); DBG "$R"
check "get-or-create same id" "$(JQ "$R" '.data.id')" "$CONV"

# Direct student-to-student conversation (from public profile, no listing).
S2ID=$(JQ "$(NOPOST "$API/login" '{"email":"student2@example.com","password":"password"}')" '.data.user.id')
R=$(POST "$TTOKEN" "$API/users/$S2ID/message" '{}'); DBG "$R"
check "direct conversation get-or-create" "$(JQ "$R" '.data.listing == null and .data.other_user.id != null')" "true"
R=$(POST "$TTOKEN" "$API/conversations/$CONV/messages" '{"body":"Phòng còn không ạ?"}'); DBG "$R"
MSG1=$(JQ "$R" '.data.id')
check "send text message is_mine" "$(JQ "$R" '.data.is_mine')" "true"
printf '%%PDF-1.4 test' > /tmp/e2e.pdf
R=$(POSTF "$TTOKEN" "$API/conversations/$CONV/messages" -F "body=Xem hop dong nhe" -F "file=@/tmp/e2e.pdf;type=application/pdf"); DBG "$R"
check "attachment message name" "$(JQ "$R" '.data.attachment_name')" "e2e.pdf"
AURL=$(JQ "$R" '.data.attachment_url')
[[ "$AURL" == /* ]] && AURL="${API_ORIGIN}${AURL}"
check "attachment signed url 200" "$(curl -s -o /dev/null -w '%{http_code}' "$AURL")" "200"
R=$(GET "$TTOKEN" "$API/conversations/$CONV/messages?after_id=$MSG1"); DBG "$R"
check "after_id returns newer msg" "$(JQ "$R" '.data[0].attachment_name')" "e2e.pdf"

R=$(NOPOST "$API/login" '{"email":"landlord1@example.com","password":"password"}'); DBG "$R"
LTOKEN=$(JQ "$R" '.data.token')
R=$(GET "$LTOKEN" "$API/conversations"); DBG "$R"
check "landlord sees conv unread>0" "$(JQ "$R" "[.data[]|select(.id==$CONV)][0].unread_count > 0")" "true"
R=$(POST "$LTOKEN" "$API/conversations/$CONV/messages" '{"body":"Con ban oi, moi minh xem"}'); DBG "$R"
check "landlord reply is_mine" "$(JQ "$R" '.data.is_mine')" "true"
R=$(GET "$TTOKEN" "$API/conversations"); DBG "$R"
check "student unread=1" "$(JQ "$R" "[.data[]|select(.id==$CONV)][0].unread_count")" "1"
R=$(POST "$TTOKEN" "$API/conversations/$CONV/read" '{}'); DBG "$R"
check "mark read null data" "$(JQ "$R" '.data')" "null"
R=$(GET "$TTOKEN" "$API/conversations"); DBG "$R"
check "student unread=0 after read" "$(JQ "$R" "[.data[]|select(.id==$CONV)][0].unread_count")" "0"
OUT_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/conversations/$CONV/read" -H "Authorization: Bearer $STOKEN" -H "Accept: application/json")
check "outsider read -> 404" "$OUT_CODE" "404"

echo "=== STUDENT: Review form on RoomDetail (can_review flow) ==="
R=$(GET "$TTOKEN" "$API/listings/$LID"); DBG "$R"
check "can_review true after convo" "$(JQ "$R" '.data.can_review')" "true"
R=$(POST "$TTOKEN" "$API/listings/$LID/reviews" '{"listing_rating":5,"landlord_rating":4,"comment":"Chu nha de thuong"}'); DBG "$R"
check "review created rating" "$(JQ "$R" '.data.listing_rating')" "5"
R=$(POST "$TTOKEN" "$API/listings/$LID/reviews" '{"listing_rating":4,"landlord_rating":4}'); DBG "$R"
check "second review -> 422" "$(JQ "$R" '.message != null')" "true"
R=$(NOGET "$API/listings/$LID/reviews"); DBG "$R"
check "public reviews show student name" "$(JQ "$R" '.data[0].student.name != null')" "true"

echo "=== STUDENT: AI pages (503 fallback or live AI, both OK) ==="
R=$(POST "$TTOKEN" "$API/ai/roommates" '{}'); DBG "$R"
check_ai "ai/roommates" "$R"

# Public student profile (linked from Roommates results): PII-safe.
MYID=$(JQ "$(GET "$TTOKEN" "$API/me")" '.data.id')
R=$(NOGET "$API/users/$MYID"); DBG "$R"
check "public student profile no email/phone" "$(JQ "$R" '(.data.email == null) and (.data.phone == null) and (.data.interests|type == "array")')" "true"
LANDLORD_ID=$(JQ "$(NOPOST "$API/login" '{"email":"landlord1@example.com","password":"password"}')" '.data.user.id')
R=$(NOGET "$API/users/$LANDLORD_ID"); DBG "$R"
check "landlord public profile -> 404" "$(JQ "$R" '.message != null')" "true"
R=$(POST "$TTOKEN" "$API/ai/area-suggestions" '{}'); DBG "$R"
check_ai "ai/area-suggestions" "$R"
R=$(POST "$TTOKEN" "$API/ai/chat" '{"message":"xin chao"}'); DBG "$R"
check_ai "ai/chat" "$R"

echo "=== ROLE GUARDS: student blocked from landlord endpoints ==="
R=$(GET "$TTOKEN" "$API/my/listings"); DBG "$R"
check "student GET /my/listings -> 403 msg" "$(JQ "$R" '.message')" "Bạn không có quyền thực hiện thao tác này."
R=$(POST "$TTOKEN" "$API/listings" '{}'); DBG "$R"
check "student POST /listings -> 403 msg" "$(JQ "$R" '.message')" "Bạn không có quyền thực hiện thao tác này."

echo "=== LANDLORD: my listings + CRUD + images + status ==="
R=$(GET "$LTOKEN" "$API/my/listings"); DBG "$R"
TOTAL_MY=$(JQ "$R" '.meta.total')
check "my listings total>=10" "$([[ $TOTAL_MY -ge 10 ]] && echo true)" "true"
R=$(POST "$LTOKEN" "$API/listings" "{\"title\":\"Phong e2e test gan truong\",\"type\":\"room\",\"price\":2300000,\"area_m2\":18,\"address\":\"99 Duong e2e\",\"latitude\":10.87,\"longitude\":106.78,\"ward_id\":$WARD,\"amenity_ids\":[$AM]}"); DBG "$R"
NEWID=$(JQ "$R" '.data.id')
check "create listing available" "$(JQ "$R" '.data.status')" "available"
R=$(POST "$LTOKEN" "$API/listings" '{"title":"abc"}'); DBG "$R"
check "invalid create -> 422 errors.title" "$(JQ "$R" '.errors.title[0] != null')" "true"
# Real 1x1 PNG (backend validates actual image content).
base64 -d > /tmp/e2e.png <<'B64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
B64
R=$(POSTF "$LTOKEN" "$API/listings/$NEWID/images" -F "images[]=@/tmp/e2e.png;type=image/png"); DBG "$R"
check "image upload returns url" "$(JQ "$R" '.data[0].url != null')" "true"
IMGID=$(JQ "$R" '.data[0].id')
IMGURL=$(JQ "$R" '.data[0].url')
check "image url fetch 200" "$(curl -s -o /dev/null -w '%{http_code}' "$IMGURL")" "200"
R=$(PUT "$LTOKEN" "$API/listings/$NEWID" '{"status":"rented"}'); DBG "$R"
check "status -> rented" "$(JQ "$R" '.data.status')" "rented"
R=$(GET "$LTOKEN" "$API/my/listings?status=rented"); DBG "$R"
check "filter status=rented contains new" "$(JQ "$R" "[.data[]|select(.id==$NEWID)]|length")" "1"
R=$(PUT "$LTOKEN" "$API/listings/$NEWID" '{"price":2500000,"title":"Phong e2e da sua"}'); DBG "$R"
check "edit listing title" "$(JQ "$R" '.data.title')" "Phong e2e da sua"
R=$(DEL "$LTOKEN" "$API/listings/$NEWID/images/$IMGID"); DBG "$R"
check "delete image null data" "$(JQ "$R" '.data')" "null"
R=$(DEL "$LTOKEN" "$API/listings/$NEWID"); DBG "$R"
check "delete listing null data" "$(JQ "$R" '.data')" "null"
R=$(POST "$TTOKEN" "$API/ai/description" '{"title":"test"}'); DBG "$R"
check "student ai/description -> 403" "$(JQ "$R" '.message')" "Bạn không có quyền thực hiện thao tác này."

echo "=== AI price-advice (deterministic: 3 fixtures = enough comparables) ==="
FIX_IDS=()
for p in 2000000 2100000 2200000 2500000; do
  R=$(POST "$LTOKEN" "$API/listings" "{\"title\":\"Fixture gia $p\",\"type\":\"room\",\"price\":$p,\"area_m2\":20,\"address\":\"99 Duong fixture\",\"latitude\":10.87,\"longitude\":106.78,\"ward_id\":$WARD}")
  FIX_IDS+=("$(JQ "$R" '.data.id')")
done
TARGET=${FIX_IDS[3]}
R=$(POST "$TTOKEN" "$API/ai/price-advice" "{\"listing_id\":$TARGET}"); DBG "$R"
check_ai "ai/price-advice (>=3 comparables)" "$R"

echo "=== LOGOUT (navbar dropdown) ==="
# Cleanup fixtures first (needs a live token), then revoke both tokens.
for id in "${FIX_IDS[@]}"; do
  [[ -n "$id" && "$id" != "null" ]] && DEL "$LTOKEN" "$API/listings/$id" >/dev/null
done
LEFT=$(JQ "$(GET "$LTOKEN" "$API/my/listings?per_page=50")" '[.data[]|select(.title|startswith("Fixture gia"))]|length')
check "fixtures cleaned up" "$LEFT" "0"
R=$(POST "$TTOKEN" "$API/logout" '{}'); DBG "$R"
check "logout null data" "$(JQ "$R" '.data')" "null"
R=$(GET "$TTOKEN" "$API/me"); DBG "$R"
check "revoked token -> 401 msg" "$(JQ "$R" '.message')" "Bạn chưa đăng nhập."
POST "$LTOKEN" "$API/logout" '{}' >/dev/null

echo ""
echo "================================"
echo "RESULT: PASS=$PASS FAIL=$FAIL"
if [[ $FAIL -eq 0 ]]; then echo "ALL GREEN"; else echo "SOME TESTS FAILED"; exit 1; fi
