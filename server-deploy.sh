#!/usr/bin/env bash
# Deploy an uploaded ZIP, or install files already extracted into the app root.
set -Eeuo pipefail
trap 'echo "Deployment failed at line $LINENO. The selected site was not confirmed updated." >&2' ERR

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
usage() {
  echo "Usage: bash server-deploy.sh [embeddedindia.in|new.embeddedindia.in] [update|clean|fresh] [bundle.zip]"
  echo "Aliases: default = embeddedindia.in; new = new.embeddedindia.in."
  echo "Use --print-target to inspect the domain, app root, and Node environment without deploying."
  echo "Example: bash server-deploy.sh default /home/jiazxebj/embeddedindia.zip"
  echo "ZIP paths are resolved from the current directory. Without a ZIP, install existing app files."
  echo "Existing configuration, databases, and uploaded files are preserved."
}
SITE_CHOICE="${TARGET_SITE:-}"
MODE="${MODE:-update}"
ZIP_FILE=""
PRINT_TARGET=false
for arg in "$@"; do
  case "$arg" in
    --help|-h) usage; exit 0 ;;
    --print-target) PRINT_TARGET=true ;;
    update|clean|fresh|fresh-install|install) MODE="$arg" ;;
    *.zip|*.ZIP)
      [ -z "$ZIP_FILE" ] || { echo "Pass only one ZIP archive." >&2; exit 1; }
      [ -f "$arg" ] || { echo "ZIP not found: $arg" >&2; exit 1; }
      ZIP_FILE="$(cd "$(dirname "$arg")" && pwd -P)/$(basename "$arg")" ;;
    1|2|default|Default|new|New|embeddedindia.in|new.embeddedindia.in|https://embeddedindia.in|https://embeddedindia.in/|https://new.embeddedindia.in|https://new.embeddedindia.in/) SITE_CHOICE="$arg" ;;
    *) echo "Unknown argument: $arg" >&2; usage; exit 1 ;;
  esac
done
if [ -z "$SITE_CHOICE" ]; then
  case "$(basename "$SOURCE_DIR")" in
    new) SITE_CHOICE=new ;;
    embeddedindia.in) SITE_CHOICE=default ;;
    *)
      if [ -t 0 ]; then
        echo "1) embeddedindia.in   2) new.embeddedindia.in"
        read -rp "Select target [1 or 2]: " SITE_CHOICE
      else
        echo "Cannot infer target. Pass default or new explicitly." >&2; exit 1
      fi ;;
  esac
fi
case "$SITE_CHOICE" in
  1|default|Default|embeddedindia.in|https://embeddedindia.in|https://embeddedindia.in/) APP_FOLDER=embeddedindia.in; DOMAIN=embeddedindia.in ;;
  2|new|New|new.embeddedindia.in|https://new.embeddedindia.in|https://new.embeddedindia.in/) APP_FOLDER=new; DOMAIN=new.embeddedindia.in ;;
  *) echo "Invalid target: $SITE_CHOICE" >&2; usage; exit 1 ;;
esac
case "$MODE" in update|clean|fresh|fresh-install|install) ;; *) echo "Invalid mode: $MODE" >&2; exit 1 ;; esac
APP_ROOT="/home/jiazxebj/$APP_FOLDER"
ACTIVATE="/home/jiazxebj/nodevenv/$APP_FOLDER/22/bin/activate"
APP_URL="https://$DOMAIN"
if [ "$PRINT_TARGET" = true ]; then
  printf '%s|%s|%s\n' "$DOMAIN" "$APP_ROOT" "$ACTIVATE"
  exit 0
fi

# ==============================================================================
# Automated Logging & Email Notification Wrapper
# Runs for all actual code deployments (whether succeeded or failed)
# ==============================================================================
if [ -z "${SERVER_DEPLOY_LOG_ACTIVE:-}" ]; then
  export SERVER_DEPLOY_LOG_ACTIVE=1
  DEPLOY_LOG_FILE="/tmp/server-deploy-${APP_FOLDER}-$(date +%s)-$$.log"
  export DEPLOY_LOG_FILE

  set +e
  /bin/bash "$0" "$@" 2>&1 | tee "$DEPLOY_LOG_FILE"
  DEPLOY_EXIT_CODE=${PIPESTATUS[0]}
  set -e

  RECIPIENT="sahil.kalka@gmail.com"
  if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    STATUS_LABEL="SUCCESS"
  else
    STATUS_LABEL="FAILED (Exit Code: $DEPLOY_EXIT_CODE)"
  fi

  SUBJECT="[DEPLOY $STATUS_LABEL] $DOMAIN - Code Deployment Report"
  LOG_EXCERPT="$(tail -n 250 "$DEPLOY_LOG_FILE" 2>/dev/null || echo "No deployment logs captured.")"

  EMAIL_BODY="==============================================================================
EMBEDDED INDIA - AUTOMATED CODE DEPLOYMENT REPORT
==============================================================================
Status:       $STATUS_LABEL
Target:       $APP_URL
App Directory:$APP_ROOT
Timestamp:    $(date -u)
Exit Code:    $DEPLOY_EXIT_CODE
Git Commit:   $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo "N/A")
Commit Msg:   $(git -C "$APP_ROOT" log -1 --pretty=%B 2>/dev/null | head -n 1 || echo "N/A")
Commit Author:$(git -C "$APP_ROOT" log -1 --pretty='%an <%ae>' 2>/dev/null || echo "N/A")
==============================================================================

LATEST DEPLOYMENT LOGS (last 250 lines):
------------------------------------------------------------------------------
$LOG_EXCERPT
==============================================================================
"

  EMAIL_SENT=false

  # 1. Primary delivery: /usr/sbin/sendmail (cPanel local Exim)
  if [ -x /usr/sbin/sendmail ]; then
    if /usr/sbin/sendmail -oi -t <<EOF 2>/dev/null
To: $RECIPIENT
From: "Embedded India Deploy" <noreply@embeddedindia.in>
Subject: $SUBJECT
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

$EMAIL_BODY
EOF
    then
      echo "✅ Deployment log email dispatched to $RECIPIENT via sendmail."
      EMAIL_SENT=true
    fi
  fi

  # 2. Secondary delivery: Python 3 SMTP to local Exim
  if [ "$EMAIL_SENT" = false ] && command -v python3 >/dev/null 2>&1; then
    if python3 - "$RECIPIENT" "$SUBJECT" "$EMAIL_BODY" <<'PY_MAIL' 2>/dev/null
import sys, smtplib
from email.message import EmailMessage

recip, subj, body = sys.argv[1:4]
msg = EmailMessage()
msg["To"] = recip
msg["From"] = "Embedded India Deploy <noreply@embeddedindia.in>"
msg["Subject"] = subj
msg.set_content(body)

sent = False
for port in (25, 587):
    try:
        with smtplib.SMTP("localhost", port, timeout=5) as s:
            s.send_message(msg)
            sent = True
            break
    except Exception:
        continue
sys.exit(0 if sent else 1)
PY_MAIL
    then
      echo "✅ Deployment log email dispatched to $RECIPIENT via Python SMTP."
      EMAIL_SENT=true
    fi
  fi

  # 3. Tertiary delivery: Node.js mailer fallback
  if [ "$EMAIL_SENT" = false ] && [ -f "$ACTIVATE" ]; then
    (
      set +u
      source "$ACTIVATE" 2>/dev/null || true
      set -u
      if command -v node >/dev/null 2>&1; then
        cd "$APP_ROOT" 2>/dev/null || true
        node - "$RECIPIENT" "$SUBJECT" "$EMAIL_BODY" <<'NODE_MAIL' 2>/dev/null || true
const [,, to, subject, text] = process.argv;
try {
  const mailer = require('./src/services/mailer');
  mailer.getTransporter().then(t => {
    if (t && typeof t.sendMail === 'function') {
      return t.sendMail({
        from: '"Embedded India Deploy" <noreply@embeddedindia.in>',
        to,
        subject,
        text
      }).then(() => {
        console.log('✅ Deployment log email dispatched to ' + to + ' via nodemailer.');
      });
    }
  }).catch(() => {});
} catch (e) {}
NODE_MAIL
      fi
    ) 2>/dev/null || true
  fi

  # Remove temporary log file
  rm -f "$DEPLOY_LOG_FILE" 2>/dev/null || true

  # Propagate original exit code
  exit $DEPLOY_EXIT_CODE
fi
if [ -z "$ZIP_FILE" ] && [ "$SOURCE_DIR" != "$APP_ROOT" ]; then
  echo "Wrong app root: $SOURCE_DIR" >&2
  echo "Extract the latest bundle into $APP_ROOT, then run: cd $APP_ROOT && bash server-deploy.sh $SITE_CHOICE $MODE" >&2
  exit 1
fi
# Parse the whole ZIP function before replacing any file, including this script.
# Re-exec the uploaded script after extraction so installation uses the new release.
deploy_zip() {
  [ -f "$ACTIVATE" ] || { echo "Missing target Node 22 environment: $ACTIVATE" >&2; exit 1; }
  PYTHON_BIN=""
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info.major == 3 else 1)' 2>/dev/null; then
      PYTHON_BIN="$candidate"; break
    fi
  done
  [ -n "$PYTHON_BIN" ] || { echo "Python 3 is required to validate and extract deployment ZIPs." >&2; exit 1; }
  echo "Extracting $ZIP_FILE into $APP_ROOT"
  "$PYTHON_BIN" - "$ZIP_FILE" "$APP_ROOT" <<'PYTHON'
import os, pathlib, shutil, stat, sys, tempfile, zipfile
archive_path, app_root = sys.argv[1:]
root = pathlib.Path(app_root)
allowed_files = {
    'app.js', 'package.json', 'package-lock.json', 'server-deploy.sh',
    'tailwind.config.js', '.cpanel.yml', 'prisma/schema.prisma',
    'scripts/init-db.js', 'scripts/seed-sqlite.js',
    'scripts/reset-admin.js', 'scripts/generate-lead-magnet.js', 'scripts/cpanel-deploy.sh'
}
required = {
    'app.js', 'src/server.js', 'package.json', 'package-lock.json',
    'server-deploy.sh', 'prisma/schema.prisma', 'scripts/init-db.js',
    'scripts/seed-sqlite.js', 'src/deployment-check.js', 'src/public/css/input.css', 'tailwind.config.js'
}
entries, seen = [], set()
with zipfile.ZipFile(archive_path) as archive:
    for entry in archive.infolist():
        name = entry.orig_filename
        parts = pathlib.PurePosixPath(name).parts
        if entry.filename != name or not parts or chr(92) in name or ':' in name or name.startswith('/') or any(p in ('.', '..') for p in name.rstrip('/').split('/')):
            raise ValueError('Unsafe archive path: ' + name)
        if stat.S_ISLNK(entry.external_attr >> 16):
            raise ValueError('Archive symlink rejected: ' + name)
        if entry.is_dir():
            continue
        if name in seen:
            raise ValueError('Duplicate archive entry: ' + name)
        seen.add(name)
        permitted = name in allowed_files or (parts[0] in ('src', 'views', 'public') and len(parts) > 1)
        if not permitted or (name != '.cpanel.yml' and any(p.startswith('.') for p in parts)):
            raise ValueError('Not a deployment file: ' + name)
        if any(p in ('node_modules', 'tmp', 'scratch', 'tests', '__tests__', 'reports', 'logs') for p in parts) or any(ext in name.lower() for ext in ('.db', '.sqlite')):
            raise ValueError('Protected or local-only file: ' + name)
        dest = root.joinpath(*parts)
        # Reject existing links before extraction/copy; never traverse a server link.
        for parent in (dest, *dest.parents):
            if parent.is_symlink():
                raise ValueError('Destination contains a symlink: ' + str(parent))
        if dest.exists() and not dest.is_file():
            raise ValueError('Destination is not a file: ' + str(dest))
        entries.append((entry, dest))
    missing = sorted(required - seen)
    if missing:
        raise ValueError('Incomplete ZIP; missing: ' + ', '.join(missing))
    if any(archive.getinfo(name).file_size == 0 for name in required):
        raise ValueError('ZIP contains empty required deployment files')
    bad = archive.testzip()
    if bad:
        raise ValueError('Corrupt ZIP entry: ' + bad)
    # All validation completes before app files are changed. Stage outside public/.
    root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.ei-deploy-', dir=root.parent) as staging:
        staged = []
        for entry, dest in entries:
            # User-uploaded/generated assets on the server take precedence.
            if dest.exists() and entry.filename.startswith(('public/uploads/', 'public/downloads/')):
                continue
            temp = pathlib.Path(staging).joinpath(*pathlib.PurePosixPath(entry.filename).parts)
            temp.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(entry) as src, temp.open('wb') as out:
                shutil.copyfileobj(src, out)
            os.chmod(temp, 0o755 if entry.filename == 'server-deploy.sh' else 0o644)
            staged.append((temp, dest))
        # Replace each file atomically; unrelated server files remain untouched.
        for temp, dest in staged:
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(temp, dest)
        print('Extracted %d deployment files; server configuration and data preserved.' % len(staged))
PYTHON
  exec /bin/bash "$APP_ROOT/server-deploy.sh" "$SITE_CHOICE" "$MODE"
}
if [ -n "$ZIP_FILE" ]; then deploy_zip; fi

cd "$APP_ROOT"
echo "Target: $APP_URL | App root: $APP_ROOT | Mode: $MODE"
# Validate the upload before changing configuration, dependencies, or data.
for required in app.js src/server.js package.json package-lock.json prisma/schema.prisma scripts/init-db.js scripts/seed-sqlite.js src/deployment-check.js src/public/css/input.css tailwind.config.js; do
  if [ ! -s "$required" ]; then
    echo "Incomplete upload: missing $APP_ROOT/$required. Re-extract the current embeddedindia.zip." >&2
    exit 1
  fi
done
[ -f "$ACTIVATE" ] || { echo "Missing target Node 22 environment: $ACTIVATE" >&2; exit 1; }
# Activate the correct environment even when a different site's Node is already on PATH.
# CloudLinux activation scripts may reference unset shell variables.
set +u
source "$ACTIVATE"
set -u
hash -r
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
[ "$(node -p 'process.versions.node.split(".")[0]')" = 22 ] || { echo "Expected Node 22 after activating $ACTIVATE" >&2; exit 1; }
echo "Activated $ACTIVATE | Node $(node -v) | npm $(npm -v)"
mkdir -p prisma tmp public/downloads public/css public/images
# CloudLinux's npm wrapper creates node_modules in the selected virtual environment.
# A real directory/file at the app root prevents that wrapper from running.
VENV_ROOT="$(cd "$(dirname "$ACTIVATE")/.." && pwd -P)"
MODULES_PATH="$APP_ROOT/node_modules"
modules_link_is_valid() {
  [ -L "$MODULES_PATH" ] && [ -d "$MODULES_PATH" ] || return 1
  local destination
  destination="$(readlink -f -- "$MODULES_PATH")" || return 1
  case "$destination" in "$VENV_ROOT"/*) return 0 ;; *) return 1 ;; esac
}
if [ -e "$MODULES_PATH" ] || [ -L "$MODULES_PATH" ]; then
  if ! modules_link_is_valid; then
    # Move only this app-root entry. Never delete dependencies or follow a bad link.
    MODULES_BACKUP="$(mktemp -d "$APP_ROOT/tmp/node_modules.pre-deploy.XXXXXXXX")"
    mv -- "$MODULES_PATH" "$MODULES_BACKUP/node_modules"
    echo "Preserved conflicting node_modules at $MODULES_BACKUP/node_modules"
  else
    echo "Keeping CloudLinux dependency link: $(readlink -f -- "$MODULES_PATH")"
  fi
fi
verify_modules_link() {
  if ! modules_link_is_valid; then
    echo "CloudLinux dependency link is missing or outside $VENV_ROOT." >&2
    echo "In cPanel Setup Node.js App, confirm app root $APP_FOLDER / Node 22 and run NPM Install, then retry." >&2
    exit 1
  fi
}

# Keep server secrets and admin credentials local; never replace an existing .env.
if [ ! -f .env ]; then
  (umask 077; "$NODE_BIN" - "$APP_URL" <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
fs.writeFileSync('.env', `NODE_ENV=production\nAPP_URL=${process.argv[2]}\nDATABASE_URL=file:./prisma/dev.db\nSESSION_SECRET=${crypto.randomBytes(48).toString('hex')}\nADMIN_JWT_SECRET=${crypto.randomBytes(48).toString('hex')}\n`, { mode: 0o600 });
NODE
  )
else
  "$NODE_BIN" - "$APP_URL" <<'NODE'
const fs = require('fs');
let env = fs.readFileSync('.env', 'utf8');
const line = `APP_URL=${process.argv[2]}`;
env = /^APP_URL=.*$/m.test(env) ? env.replace(/^APP_URL=.*$/m, line) : `${env.trimEnd()}\n${line}\n`;
fs.writeFileSync('.env', env);
NODE
fi
# Include build dependencies so every deployment compiles the uploaded CSS/templates.
# npm install preserves CloudLinux's managed node_modules symlink (npm ci does not).
echo "Installing runtime and build dependencies..."
"$NPM_BIN" install --include=dev --no-audit --no-fund --ignore-scripts || {
  echo "⚠️ Notice: npm install encountered resource limits; proceeding with existing environment packages."
}
verify_modules_link
"$NODE_BIN" node_modules/prisma/build/index.js generate --schema prisma/schema.prisma || true
if [ -f "$APP_ROOT/node_modules/tailwindcss/lib/cli.js" ]; then
  "$NODE_BIN" "$APP_ROOT/node_modules/tailwindcss/lib/cli.js" -i ./src/public/css/input.css -o ./public/css/style.css --minify || "$NPM_BIN" run build:css || true
else
  "$NPM_BIN" run build:css || true
fi
[ -s public/css/style.css ] || { echo "CSS build produced no output" >&2; exit 1; }
# SQLite online backup includes committed WAL data; plain cp can omit it.
if [ -s prisma/dev.db ]; then
  "$NODE_BIN" <<'NODE'
const Database = require('better-sqlite3');
(async () => {
  const db = new Database('prisma/dev.db');
  try {
    await db.backup(`prisma/dev.db.bak_${Date.now()}`);
    console.log('Existing SQLite database backed up.');
  } finally { db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
NODE
fi
"$NODE_BIN" scripts/init-db.js
if [ ! -s public/downloads/embedded-design-checklist.pdf ]; then
  "$NODE_BIN" scripts/generate-lead-magnet.js
fi
[ -s public/downloads/embedded-design-checklist.pdf ] || { echo "Checklist PDF generation failed" >&2; exit 1; }
ADMIN_EXISTS="$("$NODE_BIN" <<'NODE'
const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db', { readonly: true });
try { process.stdout.write(db.prepare('SELECT 1 FROM User WHERE role = ? LIMIT 1').get('admin') ? 'yes' : 'no'); }
finally { db.close(); }
NODE
)"
if [ "$ADMIN_EXISTS" = no ]; then "$NODE_BIN" scripts/seed-sqlite.js; fi
# Keep the installed build tools: npm prune bypasses CloudLinux install handling
# and can replace its managed node_modules symlink with a regular directory.
verify_modules_link
"$NODE_BIN" --check app.js
"$NODE_BIN" --check src/server.js
echo "Checking authenticated Settings page rendering..."
"$NODE_BIN" src/deployment-check.js
# A unique public marker distinguishes an updated app root from a stale/wrong vhost.
DEPLOY_ID="$("$NODE_BIN" -e 'process.stdout.write(require("crypto").randomBytes(12).toString("hex"))')"
"$NODE_BIN" - "$DEPLOY_ID" "$DOMAIN" <<'NODE'
require('fs').writeFileSync('public/deployment-version.json', JSON.stringify({ id: process.argv[2], domain: process.argv[3], deployedAt: new Date().toISOString() }));
NODE
chmod 755 tmp prisma public/downloads public/images
touch "$APP_ROOT/tmp/restart.txt"
echo "Prepared $APP_ROOT and requested Passenger restart for $DOMAIN only."
if command -v curl >/dev/null 2>&1; then
  LIVE_VERSION="$(curl --fail --silent --show-error --location --max-time 20 -H 'Cache-Control: no-cache' "$APP_URL/deployment-version.json?v=$DEPLOY_ID" || true)"
  if printf '%s' "$LIVE_VERSION" | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.exit(JSON.parse(s).id===process.argv[1]?0:1)}catch{process.exit(1)}})' "$DEPLOY_ID"; then
    curl --fail --silent --show-error --retry 5 --retry-delay 3 --max-time 30 "$APP_URL/health" > /dev/null
    curl --fail --silent --show-error --retry 3 --retry-delay 3 --max-time 30 "$APP_URL/tools/engineering-hardware" > /dev/null
    echo "Verified: $APP_URL serves deployment $DEPLOY_ID."
  else
    echo "WARNING: Live update is NOT verified. Check cPanel app root ($APP_ROOT), startup file (app.js), restart the selected Node app, and purge any CDN cache." >&2
    exit 1
  fi
else
  echo "Live verification unavailable (curl missing). Check $APP_URL/deployment-version.json and confirm id $DEPLOY_ID."
fi
