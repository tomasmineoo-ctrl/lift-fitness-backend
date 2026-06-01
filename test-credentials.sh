#!/bin/bash

# Test all demo credentials

DOMAIN="https://ctrlgym.org"
BASIC_AUTH="SEBASTIAN:TOMASYSEBASTIAN"

echo "🧪 Testing LIFT Fitness Demo Credentials"
echo "========================================"
echo ""

# Test credentials
declare -a EMAILS=("admin@lift.com" "recep@lift.com" "trainer@lift.com" "nutricion@lift.com" "carlos@mail.com")
declare -a PASSWORDS=("Lift2025#" "recep2025" "trainer2025" "nutri2025" "1234")
declare -a ROLES=("Admin" "Recepción" "Entrenador" "Nutricionista" "Socio")

for i in "${!EMAILS[@]}"; do
  EMAIL="${EMAILS[$i]}"
  PASSWORD="${PASSWORDS[$i]}"
  ROLE="${ROLES[$i]}"

  echo "🔐 Testing $ROLE ($EMAIL)..."

  RESPONSE=$(curl -s -X POST "$DOMAIN/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    -u "$BASIC_AUTH")

  if echo "$RESPONSE" | grep -q "token"; then
    echo "  ✅ Login successful for $EMAIL"
    echo ""
  else
    echo "  ❌ Login failed for $EMAIL"
    echo "  Response: $RESPONSE"
    echo ""
  fi
done

echo "✅ Test complete"
