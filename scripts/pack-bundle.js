// scripts/pack-bundle.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const zipOutput = path.join(rootDir, 'embeddedindia.zip');

// Clean up any old deployment archives
const staleArchives = [
  'embeddedindia.zip',
  'embedded.zip',
  'embeddedindia-cpanel-deploy.zip',
  'embeddedindia-cpanel-deploy.tar.gz'
];

for (const archive of staleArchives) {
  const p = path.join(rootDir, archive);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (e) {}
  }
}

console.log('📦 [1/3] Compiling Tailwind production stylesheet...');
try {
  execSync('npm run build:css', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ CSS build warning:', e.message);
}

console.log('📦 [2/3] Generating Prisma Client...');
try {
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ Prisma generate warning:', e.message);
}

console.log('📦 [3/3] Creating single deployment archive (embeddedindia.zip)...');

const pythonScript = `
import zipfile
import os

output_zip = r"${zipOutput}"
root_dir = r"${rootDir}"

exclude_dirs = {
    'node_modules', '.git', '.gemini', 'tests', '.vscode', '.idea', 'coverage', 'tmp'
}

exclude_files = {
    'embeddedindia.zip',
    'embedded.zip',
    'embeddedindia-cpanel-deploy.zip',
    'embeddedindia-cpanel-deploy.tar.gz',
    '.env',
    'dev.db-journal',
    'temp_bundle_script.py',
    'temp_zip_script.py'
}

exclude_extensions = {
    '.log',
    '.bak'
}

total_files = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for foldername, subfolders, filenames in os.walk(root_dir):
        # Exclude directories in-place
        subfolders[:] = [d for d in subfolders if d not in exclude_dirs]
        
        for filename in filenames:
            if filename in exclude_files:
                continue
            if filename.startswith('dev.db.bak'):
                continue
            _, ext = os.path.splitext(filename)
            if ext in exclude_extensions:
                continue
            
            filepath = os.path.join(foldername, filename)
            arcname = os.path.relpath(filepath, root_dir).replace('\\\\', '/')
            
            zf.write(filepath, arcname)
            total_files += 1

print(f"Packed {total_files} files directly into {output_zip}")
`;

const tempScriptPath = path.join(rootDir, 'temp_bundle_script.py');
fs.writeFileSync(tempScriptPath, pythonScript, 'utf8');

try {
  execSync(`python3 "${tempScriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
} catch (pyErr) {
  execSync(`python "${tempScriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
} finally {
  if (fs.existsSync(tempScriptPath)) {
    fs.unlinkSync(tempScriptPath);
  }
}

if (fs.existsSync(zipOutput)) {
  const stats = fs.statSync(zipOutput);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n============================================================`);
  console.log(`✅ Single Deployment Archive Ready: embeddedindia.zip (${sizeMb} MB)`);
  console.log(`📁 Files are placed at root for 1-click extraction.`);
  console.log(`🚀 Startup file: app.js | Installer: bash server-deploy.sh`);
  console.log(`============================================================\n`);
} else {
  console.error('❌ Failed to generate embeddedindia.zip');
  process.exit(1);
}
