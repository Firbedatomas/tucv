#!/usr/bin/env bash
# Mide el embudo recruiter desde la DB (server-side, no depende de Plausible).
# Uso: scripts/measure-recruiter.sh
# Lee PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD de tucv/.env y consulta pb.tucv.ar.
set -euo pipefail
cd "$(dirname "$0")/.."

PB="${POCKETBASE_PUBLIC_URL:-https://pb.tucv.ar}"
AE=$(grep -E '^PB_ADMIN_EMAIL=' .env | sed 's/^PB_ADMIN_EMAIL=//')
AP=$(grep -E '^PB_ADMIN_PASSWORD=' .env | sed 's/^PB_ADMIN_PASSWORD=//')

TOK=$(curl -s -X POST "$PB/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$AE\",\"password\":\"$AP\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

if [ -z "$TOK" ]; then echo "No pude autenticarme al PB. Revisá PB_ADMIN_* en .env."; exit 1; fi

count() { # $1 = colección, $2 = filtro opcional
  local q="perPage=1"
  [ -n "${2:-}" ] && q="$q&filter=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$2")"
  curl -s "$PB/api/collections/$1/records?$q" -H "Authorization: $TOK" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('totalItems',0))" 2>/dev/null || echo 0
}

echo "================ EMBUDO RECRUITER (DB) ================"
echo "Vistos (candidate_review_status):        $(count candidate_review_status)"
echo "Guardados totales (saved_candidates):    $(count saved_candidates)"
echo "  guardado:                              $(count saved_candidates 'status="guardado"')"
echo "  contactado:                            $(count saved_candidates 'status="contactado"')"
echo "  entrevistado:                          $(count saved_candidates 'status="entrevistado"')"
echo "  descartado:                            $(count saved_candidates 'status="descartado"')"
echo "  contratado:                            $(count saved_candidates 'status="contratado"')"
echo "Solicitudes de contacto (contact_requests): $(count contact_requests)"
echo "  aceptadas:                             $(count contact_requests 'status="accepted"')"
echo "Postulantes visibles (zone_visible):     $(count candidate_profiles 'consent_zone_visible=true')"
echo "======================================================"
echo "El embudo de eventos (entró panel -> abrió perfil -> visto -> guardó ->"
echo "contactó) + qué filtros/orden usan está en Plausible (analytics.tucv.ar)"
echo "y en /admin/embudo (sección 'Recruiter')."
