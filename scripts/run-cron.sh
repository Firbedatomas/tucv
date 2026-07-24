#!/usr/bin/env bash
# Dispara un endpoint de cron de la app (app/api/cron/*). Lo llama el crontab del
# VPS -- no hay scheduler propio en el repo. Lee CRON_SECRET del .env de la app
# en tiempo de ejecución para no hardcodear el secreto en el crontab.
#
# Uso: run-cron.sh <daily|weekly|flush-email-queue>
set -euo pipefail
cd "$(dirname "$0")/.."

ENDPOINT="${1:?uso: run-cron.sh <daily|weekly|flush-email-queue|capture-businesses|weekly-opportunities|indexnow>}"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-https://tucv.ar}"

# CRON_SECRET sale del mismo .env que consume el contenedor (env_file en
# docker-compose.hetzner.yml). Sin comillas en el valor (lo escribe openssl).
CRON_SECRET="$(grep -E '^CRON_SECRET=' .env | head -1 | cut -d= -f2- | tr -d ' \r\n')"
if [ -z "${CRON_SECRET}" ]; then
  echo "$(date -Is) [run-cron] CRON_SECRET no está en .env" >&2
  exit 1
fi

echo "$(date -Is) [run-cron] POST ${BASE_URL}/api/cron/${ENDPOINT}"
curl -fsS -X POST -H "Authorization: Bearer ${CRON_SECRET}" "${BASE_URL}/api/cron/${ENDPOINT}"
echo
