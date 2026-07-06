#!/usr/bin/env bash
# Corre el robot detect-seed sobre una LISTA de URLs (una tanda del piloto).
# Formato del archivo (una empresa por línea, separadas por " | "):
#   URL | rubro | zona | nombre
# Líneas vacías o que empiezan con # se ignoran.
#
# Uso: scripts/seed-batch.sh <archivo> [--dry]
set -uo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
DRY=""
[ "${2:-}" = "--dry" ] && DRY="--dry"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: scripts/seed-batch.sh <archivo> [--dry]"; exit 1
fi

ok=0; fail=0; dup=0; total=0
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  [ -z "${line// }" ] && continue
  case "$line" in \#*) continue;; esac
  url="$(echo "$line" | awk -F'|' '{print $1}' | xargs)"
  rubro="$(echo "$line" | awk -F'|' '{print $2}' | xargs)"
  zona="$(echo "$line" | awk -F'|' '{print $3}' | xargs)"
  nombre="$(echo "$line" | awk -F'|' '{print $4}' | xargs)"
  [ -z "$url" ] && continue
  total=$((total+1))
  echo "─── [$total] ${nombre:-$url}"
  out="$(timeout 45 node scripts/detect-seed.mjs "$url" --rubro "$rubro" --zona "$zona" ${nombre:+--nombre "$nombre"} $DRY 2>&1)"
  echo "$out" | grep -E 'Sembrada|Ya estaba|No pude|Error|Nombre:|WhatsApp:' | sed 's/^/    /'
  if echo "$out" | grep -q 'Sembrada'; then ok=$((ok+1));
  elif echo "$out" | grep -q 'Ya estaba'; then dup=$((dup+1));
  else fail=$((fail+1)); fi
  sleep 1
done < "$FILE"

echo ""
echo "════════════ RESUMEN ════════════"
echo "  Sembradas nuevas: $ok"
echo "  Ya estaban (dup): $dup"
echo "  Fallaron:         $fail"
echo "  Total procesadas: $total"
