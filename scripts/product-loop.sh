#!/usr/bin/env bash
# Loop de producto -- FASE DE OBSERVACIÓN.
#
# Lee las señales de producto (activación, retención, embudos), las agrega al
# progress.md y avisa por Telegram. NO toca código ni datos.
#
# El progress.md es la memoria narrativa del loop: qué se vio, qué se probó y
# sobre todo QUÉ NO FUNCIONÓ. Sin eso, un loop repite el mismo intento fallido
# cada iteración sin darse cuenta -- que es la diferencia entre un cron que
# corre y uno que aprende.
#
# Uso: ./scripts/product-loop.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PROGRESS="ops/growth-loop/progress-producto.md"
LOCK="/tmp/tucv-product-loop.lock"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-https://tucv.ar}"

# 1. Lock: si ya hay una corrida en curso, salir. No solapar.
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date -Is) [product-loop] ya hay una corrida en curso, salgo"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

CRON_SECRET="$(grep -E '^CRON_SECRET=' .env | head -1 | cut -d= -f2- | tr -d ' \r\n')"
if [ -z "${CRON_SECRET}" ]; then
  echo "$(date -Is) [product-loop] CRON_SECRET no está en .env" >&2
  exit 1
fi

# 2. Pedir el diagnóstico.
# El JSON va a un archivo, no a una variable interpolada en el fuente de
# Python: una respuesta con comillas o backslashes rompería el script.
RESP_FILE="$(mktemp)"
trap 'rmdir "$LOCK" 2>/dev/null || true; rm -f "$RESP_FILE"' EXIT

if ! curl -fsS -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL}/api/cron/product-signals" -o "$RESP_FILE" 2>/dev/null; then
  echo "$(date -Is) [product-loop] el endpoint no respondió" >&2
  exit 1
fi
if [ ! -s "$RESP_FILE" ]; then
  echo "$(date -Is) [product-loop] respuesta vacía" >&2
  exit 1
fi

mkdir -p "$(dirname "$PROGRESS")"
[ -f "$PROGRESS" ] || printf '# Progreso del loop de producto\n' > "$PROGRESS"

# 3. Escribir la entrada del día en el progress.md y armar el aviso.
RESUMEN="$(python3 - "$PROGRESS" "$RESP_FILE" <<'PY'
import json, sys, datetime, io
ruta, resp_file = sys.argv[1], sys.argv[2]
with io.open(resp_file, encoding="utf-8") as f:
    resp = json.load(f)
ev, hs = resp["evidencia"], resp["hallazgos"]
hoy = datetime.date.today().isoformat()

lineas = [f"\n## {hoy}\n"]
lineas.append("**Evidencia**\n")
lineas.append(f"- Negocios: {ev['negocios']['total']} total · {ev['negocios']['sinPublicarNunca']} nunca publicaron · "
              f"{ev['negocios']['unaSolaVezYNoVolvieron']} publicaron una vez y no volvieron · "
              f"{ev['negocios']['enPlanPago']} en plan pago\n")
lineas.append(f"- Búsquedas: {ev['busquedas']['activas']} activas · {ev['busquedas']['vencidasRecientes']} vencidas (30d) · "
              f"{ev['busquedas']['vencidasSinPostulaciones']} de esas sin ninguna postulación\n")
lineas.append(f"- Postulantes: {ev['postulantes']['total']} total · {ev['postulantes']['incompletos']} incompletos\n")
obj = ev.get("objetivos")
if obj:
    top = ", ".join(f"{k}={v}" for k, v in sorted(obj.items()) if v)
    lineas.append(f"- Objetivos (30d): {top or 'todos en cero'}\n")
else:
    lineas.append("- Objetivos: Plausible no disponible en esta corrida\n")

lineas.append("\n**Hallazgos**\n")
if not hs:
    lineas.append("- Ninguno por encima del piso de evidencia.\n")
else:
    for h in hs:
        nota = " _(muestra chica: cualitativo, no estadístico)_" if h.get("muestraChica") else ""
        lineas.append(f"- [{h['severidad']}] **{h['titulo']}** ({h['lado']}) — {h['evidencia']}{nota} → {h['sugerencia']}\n")

lineas.append("\n**Qué se hizo con esto**\n")
lineas.append("- (a completar: qué se probó, qué funcionó, qué NO funcionó)\n")

with io.open(ruta, "a", encoding="utf-8") as f:
    f.write("".join(lineas))

# Resumen corto para Telegram.
if hs:
    partes = [f"{len(hs)} hallazgo(s) de producto:"]
    for h in hs[:3]:
        nota = " (muestra chica)" if h.get("muestraChica") else ""
        partes.append(f"• [{h['severidad']}]{nota} {h['titulo']} — {h['evidencia']}")
    print("\n".join(partes))
else:
    print(f"Sin hallazgos sobre el piso. Negocios: {ev['negocios']['total']}, "
          f"búsquedas activas: {ev['busquedas']['activas']}, postulantes: {ev['postulantes']['total']}.")
PY
)"

echo "$(date -Is) [product-loop] $PROGRESS actualizado"
echo "$RESUMEN"

# 4. Avisar. Que falle Telegram no invalida la corrida: el progress.md ya quedó.
if [ -f .telegram-notify.env ]; then
  ./scripts/notify-telegram.sh "TuCV · loop de producto
$RESUMEN" || echo "$(date -Is) [product-loop] no se pudo avisar por Telegram" >&2
fi
