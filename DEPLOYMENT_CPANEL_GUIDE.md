# 🚀 cPanel Deployment Guide: 100% Terminal-Free Deployment (UI Only)

This guide walks you through deploying **Embedded India** to your cPanel server **without requiring SSH or terminal access**. You will perform the entire setup using only the **cPanel web interface**:
1. **cPanel File Manager** (Upload & Extract)
2. **cPanel "Setup Node.js App" UI** (Configuration, NPM Install button & Restart)

---

## 📦 What Makes This Zero-Terminal Compatible?

1. **Pre-Bundled SQLite Database:** `prisma/dev.db` is already pre-initialized, migrated, and seeded with default articles and the admin user inside the deployment archive. You do not need to run `prisma db push` or `seed.js`.
2. **Self-Bootstrapping Entrypoint (`app.js`):** On startup, `app.js` automatically creates missing directories and self-heals file permissions (`chmod 0666` on `prisma/dev.db` and `0777` on `prisma/`), avoiding SQLite read-only permission issues without needing terminal commands.
3. **Automated `postinstall`:** `prisma` is included in production dependencies, and `package.json` includes `"postinstall": "prisma generate"`. Clicking the **"Run NPM Install"** button directly in the cPanel UI automatically installs all packages and compiles the Prisma client engine for your hosting server.

---

## 🛠️ Step-by-Step UI Deployment Instructions

### Step 1: Pack the Deployment Zip (On Your Computer)
In your local project folder, run:
```bash
npm run pack:cpanel
```
This generates `embeddedindia-cpanel-deploy.zip` (~1.05 MB) in your project root directory.

---

### Step 2: Upload & Extract via cPanel File Manager

1. Log into your **cPanel Account**.
2. Under the **Files** section, click **File Manager**.
3. In File Manager, stay in your home directory (e.g. `/home/yourusername/`).
4. Click **+ Folder** in the top navigation bar and name it:
   ```text
   embeddedindia
   ```
   *(Keep it in your home directory, outside `public_html`, so source files remain protected).*
5. Double-click the newly created `embeddedindia` folder to open it.
6. Click **Upload** in the top menu and select `embeddedindia-cpanel-deploy.zip`.
7. Once the progress bar reaches 100% (green), close the upload tab and click **Reload** in File Manager.
8. Right-click `embeddedindia-cpanel-deploy.zip` and select **Extract** (extract to `/home/yourusername/embeddedindia`).
9. Verify that files like `app.js`, `package.json`, `prisma/`, `public/`, `src/`, and `views/` are visible directly inside `/home/yourusername/embeddedindia/`.
10. *(Optional cleanup)* Delete `embeddedindia-cpanel-deploy.zip` from File Manager to free up space.

---

### Step 3: Create the Node.js Application in cPanel UI

1. Return to the main cPanel dashboard.
2. In the **Software** section, click **Setup Node.js App**.
3. Click the blue **Create Application** button in the top right corner.
4. Fill out the application settings in the form:

| Form Field | Value to Enter | Explanation |
| :--- | :--- | :--- |
| **Node.js version** | `20.x` *(or 18.x)* | Select Node 20 LTS (recommended) |
| **Application mode** | `Production` | Optimized caching & performance |
| **Application root** | `embeddedindia` | The exact folder name you created in Step 2 |
| **Application URL** | `embeddedindia.in` *(or your domain/subdomain)* | Select your target domain from the dropdown |
| **Application startup file** | `app.js` | The self-healing root entrypoint |

---

### Step 4: Add Environment Variables in the cPanel UI

Scroll down to the **Environment variables** section on the same page. Click **Add Variable** for each of the following:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `3000` | Port handled by Passenger |
| `APP_URL` | `https://embeddedindia.in` | Your live site domain (with https://) |
| `DATABASE_URL` | `file:./prisma/dev.db` | Relative path to the SQLite database |
| `SESSION_SECRET` | `embeddedindia_secure_session_2026_xyz` | Any random secure string |
| `ADMIN_JWT_SECRET` | `embeddedindia_jwt_secret_token_9999_xyz` | Any random secret token |
| `ADMIN_DEFAULT_EMAIL` | `admin@embeddedindia.in` | Default admin email login |
| `ADMIN_DEFAULT_PASSWORD` | `AdminEmbedded@2026!` | Initial admin password |
| `SMTP_HOST` | `smtp.gmail.com` | Your mail server (or leave empty for test mode) |
| `SMTP_PORT` | `587` | 587 or 465 |
| `SMTP_SECURE` | `false` | `false` for 587, `true` for 465 |
| `SMTP_USER` | `info@embeddedindia.in` | SMTP login account |
| `SMTP_PASS` | `your-app-password` | SMTP app password |

Click the blue **Create** button in the top right to save and create the application.

---

### Step 5: Install Dependencies with the UI "Run NPM Install" Button

Once the application is created, you will remain on (or be redirected to) the application details page in the **Setup Node.js App** UI:

1. Scroll down to the **Detected configuration files** section.
2. You will see `package.json` listed.
3. Click the blue **Run NPM Install** button next to `package.json`.
4. Wait 15–45 seconds while cPanel downloads the node packages and runs `"postinstall": "prisma generate"`.
5. A green success notification will pop up in the top right corner indicating that NPM install completed successfully.

---

### Step 6: Start / Restart the Application

1. At the top of the **Setup Node.js App** screen, click the **Restart** button (or **Start App** if stopped).
2. Open your website in a new browser tab:
   `https://embeddedindia.in`
3. Your live engineering portal is now running!

---

### Step 7: Log In to Admin Panel & Test Systems

1. Open `https://embeddedindia.in/admin/login`
2. Log in with:
   - **Email:** `admin@embeddedindia.in` (or the email you set in `ADMIN_DEFAULT_EMAIL`)
   - **Password:** `AdminEmbedded@2026!` (or the password you set in `ADMIN_DEFAULT_PASSWORD`)
3. **Configure Settings (`/admin/settings`):**
   - Verify your **Offices & Locations** (`Hyderabad, India` or your preferred cities).
   - Test outgoing mail with **Test SMTP Connection**.
   - Under **Team & Administrator Accounts**, use **Change Your Active Account Password** to update your password to a private passphrase.
4. **Configure AI Engine & Scheduled Blog Generator (`/admin/ai`):**
   - Connect your AI provider API key (NVIDIA NIM, Gemini, or OpenAI) or use the built-in local engine.
   - In **Section 3**, set your desired blog generation frequency (e.g. `Daily`), review your topics queue, set your maximum allowed blog pages, and click **⚡ Run Auto-Generation Now** to generate a test article live!

---

## ❓ Frequently Asked Questions (UI Edition)

### Q: What if I update settings and want to restart without terminal?
Go to cPanel &rarr; **Setup Node.js App** &rarr; find your app &rarr; click **Restart** (circular arrow button).
Alternatively, in cPanel File Manager, create an empty file named `restart.txt` inside `/home/yourusername/embeddedindia/tmp/` to trigger an instant reload.

### Q: Do I need to chmod files if I don't have terminal?
No. `app.js` runs a self-healing permissions function on startup that grants write permissions to `prisma/dev.db` and `prisma/`. If you ever need to manually adjust permissions, you can simply right-click any file or folder in **cPanel File Manager** and click **Change Permissions**.

### Q: How do I update the site in the future?
1. Run `npm run pack:cpanel` on your computer.
2. In cPanel File Manager, upload and extract `embeddedindia-cpanel-deploy.zip` over your existing folder.
3. In cPanel Node.js App UI, click **Run NPM Install** and then click **Restart**.
