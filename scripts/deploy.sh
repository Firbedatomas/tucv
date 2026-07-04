#!/usr/bin/env bash
# Reconstruye y redeploya el contenedor `app` (tucv-app) en producción a
# partir del código fuente actual. Solo toca `app` -- nunca `pocketbase`
# (tiene datos en volumen) ni el Caddy compartido.
#
# Uso: ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Reconstruyendo imagen tucv-app..."
docker compose -f docker-compose.hetzner.yml build app

echo "==> Recreando contenedor tucv-app..."
docker compose -f docker-compose.hetzner.yml up -d --no-deps app

echo "==> Esperando a que responda..."
sleep 3
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://tucv.ar/)
if [ "$CODE" = "200" ]; then
  echo "==> Listo, tucv.ar respondió 200."
else
  echo "==> ATENCIÓN: tucv.ar respondió $CODE. Revisá 'docker logs tucv-app'."
  exit 1
fi
