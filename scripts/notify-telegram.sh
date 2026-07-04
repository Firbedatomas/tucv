#!/usr/bin/env bash
# Manda un mensaje de texto por Telegram usando las credenciales de
# .telegram-notify.env (gitignored, permisos 600).
# Uso: ./notify-telegram.sh "texto del mensaje"
set -euo pipefail
cd "$(dirname "$0")/.."
source .telegram-notify.env

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .telegram-notify.env" >&2
  exit 1
fi

MESSAGE="${1:?Uso: notify-telegram.sh \"mensaje\"}"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  -o /dev/null -w "telegram sendMessage status: %{http_code}\n"
