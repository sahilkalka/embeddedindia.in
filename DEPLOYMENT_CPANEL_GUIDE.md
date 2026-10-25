```bash
npm run pack:cpanel
```

# 🚀 Deployment Guide: GitHub Actions CI/CD & cPanel Automation

This guide covers deployment for **Embedded India (`embeddedindia.in`)**, supporting both **Automated Git Push Deployments via GitHub Actions** and **Terminal-Free Manual Deployment via the cPanel Web Interface**.

---

## 🔄 1. Automated CI/CD Deployment via GitHub Actions (Active)

The repository includes a configured workflow at [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) that automatically pulls changes and updates the production website on every push to the `main` branch.

### How the Auto-Deploy Pipeline Works:

```mermaid
flowchart LR
  A["Git Push to main"] --> B["GitHub Actions Triggered"]
  B --> C["SSH to cPanel Host"]
  C --> D["Git Fetch & Hard Reset"]
  D --> E["uapi VersionControlDeployment"]
  E --> F["./server-deploy.sh update"]
  F --> G["Phusion Passenger Reload (tmp/restart.txt)"]
```

1. **Push Event**: Any commit merged into `main` triggers `.github/workflows/deploy.yml`.
2. **Secure SSH Handshake**: The workflow securely authenticates with your cPanel server via `appleboy/ssh-action@v1.0.3`.
3. **Repository Sync**:

   ```bash
   cd /home/jiazxebj/embeddedindia.in
   git fetch origin main
   git reset --hard origin/main
   ```
4. **cPanel Version Control Registration**:

   ```bash
   uapi VersionControlDeployment create repository_root=/home/jiazxebj/embeddedindia.in
   ```
5. **Zero-Downtime Deployment Script**:

   ```bash
   bash ./server-deploy.sh update
   ```

   - Automatically detects and activates the cPanel Node.js virtual environment (`nodevenv`).
   - Backs up the SQLite database (`prisma/dev.db.bak_TIMESTAMP`).
   - Installs production dependencies only when `package.json` or `package-lock.json` changes; otherwise skips npm install.
   - Runs database table initialization (`node scripts/init-db.js`) and seeds initial content only for a new database.
   - Relies on npm's Prisma postinstall generation when dependencies are installed; does not repeat `prisma generate`.
   - Compiles Tailwind CSS if necessary (`public/css/style.css`).
   - Sets safe file permissions (`chmod 777 tmp prisma`, `chmod 666 prisma/dev.db*`).
   - Verifies server loader syntax.
   - Touches `tmp/restart.txt` to trigger an instant Phusion Passenger reload.

### Required GitHub Repository Secrets

Configure the following secrets in your GitHub repository (**Settings &rarr; Secrets and variables &rarr; Actions &rarr; Repository secrets**):

| Secret Name        | Description                                          | Example Value                              |
| :----------------- | :--------------------------------------------------- | :----------------------------------------- |
| `CPANEL_HOST`    | Hostname or IP address of your cPanel server         | `embeddedindia.in` or server IP          |
| `CPANEL_USER`    | Your cPanel Linux username                           | `jiazxebj`                               |
| `CPANEL_SSH_KEY` | Private SSH Key (RSA / Ed25519) authorized on server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `CPANEL_PORT`    | SSH Port (default: `22`)                           | `22` or hosting custom port              |

> [!TIP]
> To generate and authorize an SSH key in cPanel:
>
> 1. In cPanel, navigate to **SSH Access** &rarr; **Manage SSH Keys** &rarr; **Generate a New Key**.
> 2. Click **Authorize** next to the generated public key.
> 3. View/Download the **Private Key** and paste it into GitHub Secrets as `CPANEL_SSH_KEY`.

---

## 📦 2. Terminal-Free Manual UI Deployment (cPanel Web Interface)

If you ever need to perform a manual deployment without SSH or terminal access:

### Step 1: Pack the Deployment Bundle (On Your Computer)

```bash
npm run pack:cpanel
```

This generates a clean, optimized `embeddedindia.zip` excluding local caches, test suites, and temporary files.

### Step 2: Upload & Extract via cPanel File Manager

1. Log into your **cPanel Account**.
2. Open **File Manager** and navigate to your application root (e.g., `/home/jiazxebj/embeddedindia.in`).
3. Click **Upload**, select `embeddedindia.zip`, and extract the files directly into the repository folder.

### Step 3: Configure "Setup Node.js App" in cPanel

1. In cPanel, navigate to **Software &rarr; Setup Node.js App**.
2. If creating new, fill out:
   - **Node.js version**: `20.x` *(or 22.x LTS)*
   - **Application mode**: `Production`
   - **Application root**: `embeddedindia.in`
   - **Application URL**: `embeddedindia.in`
   - **Application startup file**: `app.js`
3. Click **Run NPM Install** under the detected `package.json`.
4. Click **Restart** (circular arrow button) at the top of the interface.

---

## ⚙️ 3. Production Environment Variables Reference (`.env`)

Add or verify these environment variables in cPanel Node.js App UI (**Environment variables** section) or in `/home/jiazxebj/embeddedindia.in/.env`:

| Variable                   | Recommended Production Value                     | Description                                                                      |
| :------------------------- | :----------------------------------------------- | :------------------------------------------------------------------------------- |
| `NODE_ENV`               | `production`                                   | Enables caching, minification, and security headers                              |
| `PORT`                   | `3000`                                         | Port handled by Passenger                                                        |
| `APP_URL`                | `https://embeddedindia.in`                     | Canonical public URL (used in SEO & sitemaps)                                    |
| `DATABASE_URL`           | `file:./prisma/dev.db`                         | Relative path to production SQLite database                                      |
| `SESSION_SECRET`         | *(Random 32+ char secret string)*              | Session cookie cryptographic signature                                           |
| `ADMIN_JWT_SECRET`       | *(Random 32+ char secret token)*               | Admin JWT session token                                                          |
| `ADMIN_DEFAULT_EMAIL`    | `admin@embeddedindia.in`                       | Email for the initial admin account; used only when no admin exists              |
| `ADMIN_DEFAULT_PASSWORD` | `AdminEmbedded@2026!`                          | Initial admin password; existing admin passwords are preserved during deployment |
| `SMTP_HOST`              | `smtp.gmail.com` *(or cPanel mail)*          | Outgoing mail server for inquiries                                               |
| `SMTP_PORT`              | `587`                                          | `587` (STARTTLS) or `465` (SSL)                                              |
| `SMTP_SECURE`            | `false`                                        | `false` for 587, `true` for 465                                              |
| `SMTP_USER`              | `info@embeddedindia.in`                        | Outgoing email address                                                           |
| `SMTP_PASS`              | *(Your email app password)*                    | Outgoing email password                                                          |
| `AI_PROVIDER`            | `nvidia` / `gemini` / `openai` / `local` | Active AI provider for blog/case-study generator                                 |
| `AI_API_KEY`             | *(Your provider API key)*                      | API key for cloud LLM inference                                                  |

---

## 🛠️ 4. Database Architecture & Self-Healing

The application uses an ultra-reliable **hybrid SQLite persistence engine** in `src/services/db.js`:

- **Dual-Mode Engine**: Operates with native `better-sqlite3` (guaranteeing 0% network or binary download failures on cPanel) and seamlessly interfaces with `@prisma/client` when binaries are present.
- **Zero-Config Migrations**: All table structures (`Project`, `User`, `Post`, `Inquiry`, `Subscriber`, `Setting`, `Analytics`, `CalculatorStat`) are created and migrated via `node scripts/init-db.js`.
- **Pre-Seeded Content**: `node scripts/seed-sqlite.js` automatically provisions the 4 rich case studies, technical articles, and default customizer settings if the database is newly initialized.
- **Automatic Permission Healing**: `app.js` runs a self-healing permissions hook on startup that ensures `prisma/` and `prisma/dev.db` have read/write access.

---

## 🔍 5. Troubleshooting & Maintenance Commands

### Instant Application Reload

```bash
touch tmp/restart.txt
```

Phusion Passenger detects this file touch and gracefully restarts worker processes without dropping traffic.

### Run Manual Server Deployment / Fix

If SSH'd into the cPanel server:

```bash
source /home/jiazxebj/nodevenv/embeddedindia.in/20/bin/activate
cd /home/jiazxebj/embeddedindia.in
bash ./server-deploy.sh update
```

### Fresh Server Installation / Full Reset

If you need a 100% clean installation (creates safety backup, reinitializes database schema, seeds default content, reinstalls dependencies & compiles production CSS):

```bash
source /home/jiazxebj/nodevenv/embeddedindia.in/20/bin/activate
cd /home/jiazxebj/embeddedindia.in
bash ./server-deploy.sh fresh
```
