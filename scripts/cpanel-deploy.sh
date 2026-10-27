#!/usr/bin/env bash
# cPanel Git deployment uses the same target resolver as GitHub Actions.
set -Eeuo pipefail
SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$SOURCE_ROOT"

target="${1:-${TARGET_SITE:-}}"

# 1. Always match the actual repository directory first if no explicit arg was passed
if [ -z "$target" ]; then
  case "$SOURCE_ROOT" in
    /home/jiazxebj/embeddedindia.in) target=embeddedindia.in ;;
    /home/jiazxebj/new) target=new.embeddedindia.in ;;
  esac
fi

# 2. Only fall back to .cpanel-target if running from an unrecognized directory
if [ -z "$target" ] && [ -f .cpanel-target ]; then
  target="$(tr -d '\r\n' < .cpanel-target)"
fi

if [ -z "$target" ]; then
  echo 'Set TARGET_SITE or create an ignored .cpanel-target file containing embeddedindia.in or new.embeddedindia.in in this Git checkout.' >&2
  exit 1
fi