#!/usr/bin/env bash
# Corre cada 1h (vía tucv-dns-check.timer). Cuando tucv.ar y pb.tucv.ar
# resuelven a este servidor:
#   1. reconstruye `app` con las URLs finales (https://tucv.ar / https://pb.tucv.ar,
#      ya son el default de .env, no hace falta pasarlas a mano)
#   2. descomenta el bloque real en el Caddyfile compartido y recrea ese Caddy
#   3. valida que https://tucv.ar responda 200
#   4. avisa UNA sola vez por Telegram
#   5. se autodesactiva (no vuelve a correr)
# Deja el dominio temporal (tucv.tomasfirbeda.com) andando en paralelo — no
# hace daño, y así queda un fallback si algo del cutover falla a mitad de
# camino.
set -uo pipefail
cd "$(dirname "$0")/.."

TUCV_AR="tucv.ar"
PB_TUCV_AR="pb.tucv.ar"
SERVER_IP="5.75.248.160"
CADDYFILE="/home/tomas/services/plausible/caddy/Caddyfile"
LOG="/tmp/tucv-dns-check.log"

log() { echo "$(date -Is) $*" | tee -a "$LOG"; }

resolved_ip=$(dig +short "$TUCV_AR" A | tail -1)
resolved_pb_ip=$(dig +short "$PB_TUCV_AR" A | tail -1)

if [ "$resolved_ip" != "$SERVER_IP" ] || [ "$resolved_pb_ip" != "$SERVER_IP" ]; then
  log "tucv.ar todavía no resuelve a $SERVER_IP (tucv.ar=$resolved_ip pb.tucv.ar=$resolved_pb_ip)"
  exit 0
fi

log "DNS resuelto. Empezando el cutover a tucv.ar..."

# 1. Rebuild de la app con las URLs finales (ya son el default en .env)
if ! docker compose -f docker-compose.hetzner.yml build app >> "$LOG" 2>&1; then
  ./scripts/notify-telegram.sh "⚠️ tucv.ar: el DNS ya resolvió pero falló el build de la app. Revisar a mano (log en $LOG)."
  exit 1
fi
docker compose -f docker-compose.hetzner.yml up -d app >> "$LOG" 2>&1

# 2. Activar el bloque real en el Caddy compartido
sed -i \
  -e '/^# tucv\.ar, www\.tucv\.ar {/,/^# }/ s/^# //' \
  -e '/^# pb\.tucv\.ar {/,/^# }/ s/^# //' \
  "$CADDYFILE"

if ! docker exec plausible-caddy caddy validate --config /etc/caddy/Caddyfile >> "$LOG" 2>&1; then
  log "ERROR: el Caddyfile no valida tras descomentar. Revisar a mano, no sigo."
  ./scripts/notify-telegram.sh "⚠️ tucv.ar: el DNS ya resolvió pero el Caddyfile no valida después de activar el bloque. Revisar a mano ($CADDYFILE)."
  exit 1
fi

# El mount de un solo archivo queda con inode viejo tras editarlo desde
# afuera del contenedor -> hace falta recrear, `caddy reload` no alcanza.
( cd /home/tomas/services/plausible/caddy && docker compose up -d --force-recreate caddy >> "$LOG" 2>&1 )

sleep 8
http_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${TUCV_AR}/")
log "https://${TUCV_AR}/ respondió $http_status"

if [ "$http_status" = "200" ]; then
  ./scripts/notify-telegram.sh "✅ tucv.ar ya está funcionando: https://tucv.ar (HTTPS activo, PocketBase en https://pb.tucv.ar). Listo para usar."
  log "Notificación enviada. Desactivando el timer de chequeo."
  systemctl disable --now tucv-dns-check.timer >> "$LOG" 2>&1 \
    || sudo systemctl disable --now tucv-dns-check.timer >> "$LOG" 2>&1 \
    || log "No pude desactivar el timer automáticamente, hacerlo a mano: systemctl disable --now tucv-dns-check.timer"
else
  ./scripts/notify-telegram.sh "⚠️ tucv.ar: DNS y Caddy ya están activos pero https://tucv.ar respondió $http_status en vez de 200. Requiere revisión manual."
fi
