#!/usr/bin/env bash
# cPanel Git deployment uses the same target resolver as GitHub Actions.
set -Eeuo pipefail
SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$SOURCE_ROOT"

target="${1:-${TARGET_SITE:-}}"

# 1. Always determine target from the folder path first
if [ -z "$target" ]; then
  case "$SOURCE_ROOT" in
    /home/jiazxebj/embeddedindia.in) target=embeddedindia.in ;;
    /home/jiazxebj/new) target=new.embeddedindia.in ;;
  esac
fi

# 2. Only check .cpanel-target if folder didn't match
if [ -z "$target" ] && [ -f .cpanel-target ]; then
  target="$(tr -d '\r\n' < .cpanel-target)"
fi

if [ -z "$target" ]; then
  echo 'Set TARGET_SITE or create an ignored .cpanel-target file containing embeddedindia.in or new.embeddedindia.in in this Git checkout.' >&2
  exit 1
fi

resolved="$(bash server-deploy.sh "$target" --print-target)"
IFS='|' read -r domain app_root activate <<< "$resolved"
if [ "${2:-}" = --print-target ]; then
  printf '%s\n' "$resolved"
  exit 0
fi
echo "cPanel Git deployment target: https://$domain ($app_root)"
[ -f "$activate" ] || { echo "Missing Node environment: $activate" >&2; exit 1; }
mkdir -p "$app_root/tmp" "$app_root/prisma"
if [ "$SOURCE_ROOT" != "$app_root" ]; then
  # Explicit source files only; never overwrite server configuration, data or uploads.
  tar --exclude='public/uploads' --exclude='public/downloads' -cf - \
    src views public scripts package.json package-lock.json app.js server-deploy.sh \
    tailwind.config.js prisma/schema.prisma | (cd "$app_root" && tar -xf -)
fi
exec /bin/bash "$app_root/server-deploy.sh" "$domain" update