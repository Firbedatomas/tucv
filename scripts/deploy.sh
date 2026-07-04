#!/usr/bin/env bash
# Reconstruye y redeploya el contenedor `app` (tucv-app) en producción a
# partir del código fuente actual. Solo toca `app` -- nunca `pocketbase`
# (tiene datos en volumen) ni el Caddy compartido.
#
# Uso: ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Este script buildea desde el disco local, NO desde un `git pull` de
# GitHub -- para que el server y GitHub (github.com/Firbedatomas/tucv)
# nunca queden distintos sin que nadie lo note, cortamos acá si hay
# cambios sin commitear o commits locales que todavía no se pushearon.
if [ -n "$(git status --porcelain)" ]; then
  echo "==> ATENCIÓN: hay cambios sin commitear. Commiteá y pusheá antes de deployar."
  exit 1
fi
if [ -n "$(git log @{u}.. 2>/dev/null)" ]; then
  echo "==> ATENCIÓN: hay commits locales sin pushear a GitHub. Pusheá antes de deployar."
  exit 1
fi

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
