#!/bin/sh
# Writes the overlay's runtime config from env when the container starts (#11).
# The app merges this file over the defaults in frontend/src/app/shared/config.ts,
# so a key left out keeps upstream's default. nginx's entrypoint runs this before nginx starts.
set -eu

CONFIG=/usr/share/nginx/html/assets/config/config.json

# JSON string with backslashes and double quotes escaped.
str() {
  printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
}

# key=value pairs, always written
set -- \
  "serverEndpoint=${SERVER_ENDPOINT:-https://data.trayb.az}" \
  "extrasEndpoint=${EXTRAS_ENDPOINT:-https://extras.trayb.az}" \
  "redirectUrl=${REDIRECT_URL:-https://trayb.az}"

# Written only when set (an empty MAPBAN_ENDPOINT turns the map ban socket off, #17).
[ "${STATS_ENDPOINT+x}" ] && set -- "$@" "statsEndpoint=$STATS_ENDPOINT"
[ "${MAPBAN_ENDPOINT+x}" ] && set -- "$@" "mapbanEndpoint=$MAPBAN_ENDPOINT"
[ "${ATTACKER_COLOR_PRIMARY+x}" ] && set -- "$@" "attackerColorPrimary=$ATTACKER_COLOR_PRIMARY"
[ "${ATTACKER_COLOR_SECONDARY+x}" ] && set -- "$@" "attackerColorSecondary=$ATTACKER_COLOR_SECONDARY"
[ "${ATTACKER_COLOR_SHIELD_CURRENCY+x}" ] && set -- "$@" "attackerColorShieldCurrency=$ATTACKER_COLOR_SHIELD_CURRENCY"
[ "${DEFENDER_COLOR_PRIMARY+x}" ] && set -- "$@" "defenderColorPrimary=$DEFENDER_COLOR_PRIMARY"
[ "${DEFENDER_COLOR_SECONDARY+x}" ] && set -- "$@" "defenderColorSecondary=$DEFENDER_COLOR_SECONDARY"
[ "${DEFENDER_COLOR_SHIELD_CURRENCY+x}" ] && set -- "$@" "defenderColorShieldCurrency=$DEFENDER_COLOR_SHIELD_CURRENCY"

{
  printf '{'
  sep=''
  for pair in "$@"; do
    printf '%s\n  %s: %s' "$sep" "$(str "${pair%%=*}")" "$(str "${pair#*=}")"
    sep=','
  done
  printf '\n}\n'
} > "$CONFIG"

echo "40-trayb-config.sh: wrote $CONFIG (server $(printf '%s' "${SERVER_ENDPOINT:-https://data.trayb.az}"))"
