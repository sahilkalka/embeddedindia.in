# cPanel deployment guide

## Select a domain in GitHub Actions

Open **GitHub → Actions → Deploy Embedded India → Run workflow**. Choose the branch/ref and the **Domain to update**: `embeddedindia.in` deploys to `/home/jiazxebj/embeddedindia.in`; `new.embeddedindia.in` deploys to `/home/jiazxebj/new`. The workflow must be on the default branch before GitHub shows the manual run button. Pushes to `main` continue automatically deploying staging (`new.embeddedindia.in`); production is selected manually.

The workflow `.github/workflows/deploy-cpanel.yml` tests and packages the checked-out commit, uploads it over SSH, then invokes `server-deploy.sh` with the selected domain. The script resolves the matching app root and Node environment. Each site's configuration, database and uploaded/generated files are preserved. Runs are queued separately for each domain. The existing cPanel Git connection can remain in place; this workflow transfers a release bundle directly and does not require an additional Git pull or manual deployment button. Avoid running cPanel's manual deployment at the same time as the workflow for that site.

Configure these repository **Actions secrets** before the first run:

| Secret                 | Value                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CPANEL_HOST`        | SSH hostname supplied by your host                                                                                                                                                                 |
| `CPANEL_USER`        | cPanel account username (currently `jiazxebj`)                                                                                                                                                   |
| `CPANEL_SSH_KEY`     | Private SSH key whose public key is authorized in cPanel                                                                                                                                           |
| `CPANEL_PORT`        | Existing connection port; panel HTTPS ports 2083/2087 are mapped to SSH port 22                                                                                                                    |
| `CPANEL_SSH_PORT`    | Optional override for a nonstandard SSH port                                                                                                                                                       |
| `CPANEL_KNOWN_HOSTS` | Optional verified SSH host-key entry. Without it, the workflow discovers the key with `ssh-keyscan` on each run (first-connection trust). Pin this secret to protect against host impersonation. |

Your existing `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_KEY`, and `CPANEL_PORT` secrets are used directly for both domains. `CPANEL_API_TOKEN` can remain configured; this SSH release-bundle path does not use it. The cPanel account needs SSH access and both Node 22 apps registered with roots `embeddedindia.in` and `new`.

Every run attempts to email `sahil.kalka@gmail.com` using the selected site's SMTP settings, identifying its domain, commit and workflow link. A success email is sent only after the deployment marker, application/database health, and engineering tools page pass live checks. Failures are labelled as failures; SMTP errors fail the notification step. Mail server acceptance does not guarantee inbox delivery.

Deployment notifications use the website's saved SMTP credentials over SSH; no SMTP secrets are needed in GitHub. Configure **Admin → Settings → Email & routing** on the website for subscriber PDF mail. The update script generates the checklist if missing. Copilot uses the provider configured in **Admin → AI** (or `AI_*` environment fallbacks); it uses labelled general guidance when no live provider is available.

References: [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [cPanel Git deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/).

This project supports two separate CloudLinux Node.js applications. Each keeps its own dependencies, configuration, database, and Passenger restart file.

| Target argument | Website                      | Application root                    | Node 22 activation script                                    |
| --------------- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `default`     | https://embeddedindia.in     | `/home/jiazxebj/embeddedindia.in` | `/home/jiazxebj/nodevenv/embeddedindia.in/22/bin/activate` |
| `new`         | https://new.embeddedindia.in | `/home/jiazxebj/new`              | `/home/jiazxebj/nodevenv/new/22/bin/activate`              |

## 1. Register each application in cPanel

Under **Software → Setup Node.js App**, create or verify these settings for each site:

- Node.js version: **22**.
- Application mode: **Production**.
- Application root: **embeddedindia.in** for production, **new** for staging.
- Application URL: the matching website in the table above.
- Application startup file: **app.js**.

Creating the app supplies its CloudLinux virtual environment. The deployment script requires the matching activation script to exist; it does not create a cPanel application or fall back to another site's Node environment.

CloudLinux documents [virtual-environment activation and its npm commands](https://docs.cloudlinux.com/cloudlinuxos/command-line_tools/#node-js-selector). Its [application editor](https://docs.cloudlinux.com/cloudlinuxos/lve_manager/#edit-application) also provides **Run npm install** and **Restart** controls.

## 2. Build a deployment ZIP locally

From the project directory on your computer:

```bash
npm run pack:cpanel
```

The command rebuilds production CSS and creates `embeddedindia.zip`. It includes app code, templates, public assets, the Prisma schema, and the runtime setup scripts. It excludes `.env`, databases and their backups, `node_modules`, tests, reports, and temporary files.

Do not add your local `node_modules` or SQLite database to the ZIP.

## 3. Upload and deploy the ZIP

Upload the latest `embeddedindia.zip` using cPanel File Manager or SFTP. On the first deployment, also upload the current `server-deploy.sh` separately so it can open the ZIP. The ZIP itself includes the updated script for subsequent deployments.

Manual extraction is unnecessary. Paths containing spaces must be quoted.

### Production

Upload the archive to `/home/jiazxebj/embeddedindia.in/embeddedindia.zip`, then run:

```bash
cd /home/jiazxebj/embeddedindia.in
bash server-deploy.sh default ./embeddedindia.zip
```

### Staging

Upload the archive to `/home/jiazxebj/new/embeddedindia.zip`, then run:

```bash
cd /home/jiazxebj/new
bash server-deploy.sh new ./embeddedindia.zip
```

You can also use an absolute ZIP path:

```bash
bash /home/jiazxebj/new/server-deploy.sh new /home/jiazxebj/embeddedindia.zip
```

The ZIP path is resolved relative to your current terminal directory. The explicit target determines the extraction destination. Without an explicit target, the script infers it from its own folder name when possible.

### What deployment does (Zero Server-Side Build)

1. Validates ZIP paths, required files, integrity, and protected destinations before replacing app files.
2. Stages and extracts the release into the selected app root, then executes the uploaded deployment script.
3. Activates that site's Node 22 virtual environment, even if another site's Node is already active.
4. Preserves a conflicting app-root `node_modules` entry and lets CloudLinux's npm wrapper create its managed link.
5. Verifies pre-compiled production assets: confirms public/css/style.css and public/downloads/embedded-design-checklist.pdf are present. Zero server-side compiler/build tools are invoked (no npm install, no tailwindcss compilation, no prisma generate).
6. Zero server-side build required: at domain, simply pushing pre-built files and touching tmp/restart.txt updates the system in <1 second.
7. Backs up an existing SQLite database using SQLite's online backup API, initializes tables, and seeds only when no admin exists.
8. Keeps the installed build tools and checks the dependency link again. It does not run `npm prune`, which can replace CloudLinux's managed symlink.
9. Checks entry-point syntax and runs `src/deployment-check.js`, which requests the authenticated Settings page locally and verifies that every module renders with HTTP 200. It then writes `public/deployment-version.json`, and touches only the selected app's `tmp/restart.txt`.
10. Requests the public deployment marker with a cache-busting URL and confirms the deployment ID.

Existing `.env`, SQLite data, and existing files under `public/uploads/` and `public/downloads/` are preserved. `APP_URL` in `.env` is synchronized with the selected domain. New files in those public folders may be installed. Unrelated server files are not removed.

The script does not fetch new source code by itself: supply the latest ZIP or update the extracted source files first.

## 4. CloudLinux node_modules repair

CloudLinux requires app-root `node_modules` to be a **symlink**, with its destination inside the application's virtual environment. A regular directory or file at that path causes this error:

```text
Cloudlinux NodeJS Selector demands to store node modules for application
in separate folder (virtual environment) pointed by symlink called "node_modules"
```

The current deployment script handles this automatically:

- A valid link into the selected Node 22 environment is retained.
- A regular directory/file, broken link, or link to a different environment is moved to a unique backup such as `tmp/node_modules.pre-deploy.ABC12345/node_modules`.
- Moving a conflicting symlink preserves the link itself; its destination is not deleted or changed.
- CloudLinux's activated npm wrapper creates the proper link during installation.
- A missing or incorrect link after installation stops deployment before it reports success.

To recover from the reported error, upload the newly built ZIP and rerun the same command:

```bash
cd /home/jiazxebj/embeddedindia.in
bash server-deploy.sh default ./embeddedindia.zip
```

Do not delete the virtual environment or copy another site's dependency folder into this app. The backup remains available for inspection; it is not automatically removed.

If npm still fails, open the matching app in **Setup Node.js App**, confirm its root and Node 22 version, and use **Run npm install**. Retry deployment afterward. Inspect dependency or native-module build errors separately; they are not treated as a successful deployment.

To inspect the link:

```bash
cd /home/jiazxebj/embeddedindia.in
ls -ld node_modules
readlink -f node_modules
```

For production, the resolved path must be inside `/home/jiazxebj/nodevenv/embeddedindia.in/22/`. For staging it must be inside `/home/jiazxebj/nodevenv/new/22/`. The deployment script checks this boundary rather than assuming a specific dependency subfolder.

## 5. Configuration and data

Each app keeps its `.env` in its own root. Preserve it across uploads.

| Variable                              | Purpose                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `NODE_ENV=production`               | Production runtime behavior.                                                         |
| `APP_URL`                           | Canonical website URL, including the sitemap origin; synchronized by deployment.     |
| `SESSION_SECRET`                    | Long random session secret. Generated if the script creates a new `.env`.          |
| `ADMIN_JWT_SECRET`                  | Long random admin-token secret. Generated if the script creates a new `.env`.      |
| `DATABASE_URL=file:./prisma/dev.db` | Database configuration; the SQLite scripts use the selected app's `prisma/dev.db`. |

Passenger manages the listening port. Keep any hosting-supplied port configuration intact.

Manage mail routing, AI provider credentials, and site settings in the admin console. The AI settings tab is `/admin/settings#ai-engine`. After the first installation, change the seeded admin password to a unique password.

SQLite backups are written beside the database as `prisma/dev.db.bak_TIMESTAMP`. Keep sufficient free disk space for backups and dependency installation. An `update`, `clean`, or `fresh` invocation preserves existing data; these modes do not erase or reset the database.

## 6. Already-extracted releases and cPanel Git deployments

If the latest release is already extracted into its target root:

```bash
cd /home/jiazxebj/embeddedindia.in
bash server-deploy.sh default update
```

For staging:

```bash
cd /home/jiazxebj/new
bash server-deploy.sh new update
```

The repository's `.cpanel.yml` invokes `scripts/cpanel-deploy.sh`. Target precedence is: explicit script argument, `TARGET_SITE`, an ignored `.cpanel-target` file in the Git checkout, then the current app root if it is exactly `/home/jiazxebj/embeddedindia.in` or `/home/jiazxebj/new`. Other checkout locations require an explicit selection. Write `embeddedindia.in` or `new.embeddedindia.in` into `.cpanel-target` on the server; it survives Git updates and is excluded from release bundles. The helper copies runtime sources while preserving configuration, databases, uploads and downloads, then runs the same domain-specific update script.

GitHub Actions selection and the cPanel Git checkout's local selection are independent. A pushed commit alone is not evidence that either server has deployed it; inspect the Actions result and selected domain's live deployment marker.

## 7. Verify and troubleshoot

A successful deployment ends with:

```text
Verified: https://embeddedindia.in serves deployment <deployment-id>.
```

Check the corresponding public URLs:

- Production marker: https://embeddedindia.in/deployment-version.json
- Staging marker: https://new.embeddedindia.in/deployment-version.json
- Production sitemap: https://embeddedindia.in/sitemap.xml
- Staging sitemap: https://new.embeddedindia.in/sitemap.xml

If files were installed but live verification fails, check the cPanel application's root, URL, startup file, and restart status. Purge a hosting/CDN cache if one is enabled. The script exits with an error when a live marker cannot be verified; it does not roll the release back automatically.

To request another restart for the selected app:

```bash
cd /home/jiazxebj/embeddedindia.in
mkdir -p tmp
touch tmp/restart.txt
```

Alternatively, use **Restart** on that application in cPanel.

A missing schema during the explicit app-root Prisma generation means the release is incomplete. Rebuild and upload the current ZIP. CloudLinux may run npm lifecycle hooks from its environment folder; the current postinstall hook defers generation when that working directory has no schema, then the deployment script generates Prisma explicitly from the app root.

### Settings returns HTTP 500 after an interrupted deployment

The earlier script ran `npm prune`, which could replace CloudLinux's dependency symlink and stop deployment before Passenger restarted. Old workers could then load new Settings templates without the new AI module's view data. The current release removes that prune step and supplies template defaults during this transition.

Upload the current ZIP and rerun the normal deployment command. Do not run `npm prune` manually in the application root. The script preserves any conflicting dependency entry, installs through CloudLinux's wrapper, verifies the Settings page, and requests a restart.

If the local Settings check fails, it prints an error and deployment stops. Look for `[ADMIN SETTINGS LOAD ERROR]`, `[UNCAUGHT ERROR]`, or `[DEPLOYMENT CHECK FAILED]` in the terminal/Passenger logs. Template errors are logged by the application error handler. The smoke check uses a temporary loopback port and a short-lived token; it does not print credentials, start cron jobs, or call AI/SMTP services.

You can repeat the read-only check after activating the site's environment:

```bash
source /home/jiazxebj/nodevenv/embeddedindia.in/22/bin/activate
cd /home/jiazxebj/embeddedindia.in
node src/deployment-check.js
```

If the local check passes but the public Settings page still returns 500, use **Restart** for the selected cPanel application and inspect its Passenger log for the current stack trace.
