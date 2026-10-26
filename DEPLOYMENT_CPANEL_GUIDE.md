# cPanel deployment guide

This project supports two separate CloudLinux Node.js applications. Each keeps its own dependencies, configuration, database, and Passenger restart file.

| Target argument | Website | Application root | Node 22 activation script |
| --- | --- | --- | --- |
| `default` | https://embeddedindia.in | `/home/jiazxebj/embeddedindia.in` | `/home/jiazxebj/nodevenv/embeddedindia.in/22/bin/activate` |
| `new` | https://new.embeddedindia.in | `/home/jiazxebj/new` | `/home/jiazxebj/nodevenv/new/22/bin/activate` |

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

### What deployment does

1. Validates ZIP paths, required files, integrity, and protected destinations before replacing app files.
2. Stages and extracts the release into the selected app root, then executes the uploaded deployment script.
3. Activates that site's Node 22 virtual environment, even if another site's Node is already active.
4. Preserves a conflicting app-root `node_modules` entry and lets CloudLinux's npm wrapper create its managed link.
5. Installs runtime and build dependencies; verifies that the dependency link points inside the selected virtual environment.
6. Generates Prisma and rebuilds Tailwind CSS from the uploaded sources.
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

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Production runtime behavior. |
| `APP_URL` | Canonical website URL, including the sitemap origin; synchronized by deployment. |
| `SESSION_SECRET` | Long random session secret. Generated if the script creates a new `.env`. |
| `ADMIN_JWT_SECRET` | Long random admin-token secret. Generated if the script creates a new `.env`. |
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

The repository's `.cpanel.yml` currently deploys to **staging**, `/home/jiazxebj/new`, and invokes `server-deploy.sh new update`. It does not deploy to production. In cPanel Git Version Control, update the checked-out source and use its deployment action when following that workflow.

This guide does not assume an active GitHub Actions deployment workflow. Pushing a commit alone is not evidence that either server has deployed it.

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
