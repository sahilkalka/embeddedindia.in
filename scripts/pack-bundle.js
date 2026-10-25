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
    'node_modules',
    '.git',
    '.github',
    '.gemini',
    '.agents',
    '.playwright-mcp',
    'tests',
    'playwright-report',
    'test-results',
    '.vscode',
    '.idea',
    'coverage',
    'tmp',
    'scratch',
    '__pycache__',
    '.cache',
    '.pytest_cache'
}

exclude_files = {
    'embeddedindia.zip',
    'embedded.zip',
    'embeddedindia-cpanel-deploy.zip',
    'embeddedindia-cpanel-deploy.tar.gz',
    '.env',
    '.env.example',
    '.gitattributes',
    '.gitignore',
    'playwright.config.js',
    '.last-run.json',
    'dev.db-journal',
    'dev.db-wal',
    'dev.db-shm',
    'temp_bundle_script.py',
    'temp_zip_script.py',
    '.DS_Store',
    'Thumbs.db',
    'qa-inspector.mjs'
}

exclude_extensions = {
    '.log',
    '.bak',
    '.tmp',
    '.tsbuildinfo'
}

total_files = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for foldername, subfolders, filenames in os.walk(root_dir):
        # Exclude directories in-place (case-insensitive check)
        subfolders[:] = [
            d for d in subfolders
            if d.lower() not in {x.lower() for x in exclude_dirs}
            and not d.startswith('.')
        ]
        
        for filename in filenames:
            fl = filename.lower()
            if fl in {x.lower() for x in exclude_files}:
                continue
            if fl.startswith('dev.db.bak') or fl.startswith('.last-run'):
                continue
            if fl.endswith('.spec.js') or fl.endswith('.test.js') or fl.endswith('.spec.ts') or fl.endswith('.test.ts'):
                continue
            _, ext = os.path.splitext(filename)
            if ext.lower() in exclude_extensions:
                continue
            
            filepath = os.path.join(foldername, filename)
            arcname = os.path.relpath(filepath, root_dir).replace('\\\\', '/')
            
            zf.write(filepath, arcname)
            total_files += 1

print(f"Packed {total_files} files directly into {output_zip}")
`;

const tempScriptPath = path.join(rootDir, 'temp_bundle_script.py');
fs.writeFileSync(tempScriptPath, pythonScript, 'utf8');

const primaryPy = process.platform === 'win32' ? 'python' : 'python3';
const secondaryPy = process.platform === 'win32' ? 'python3' : 'python';

try {
  execSync(`${primaryPy} "${tempScriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
} catch (pyErr) {
  try {
    execSync(`${secondaryPy} "${tempScriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (err2) {
    console.error('⚠️ Could not run Python zip packaging:', err2.message);
  }
} finally {
  if (fs.existsSync(tempScriptPath)) {
    fs.unlinkSync(tempScriptPath);
  }
}

if (fs.existsSync(zipOutput)) {
  const stats = fs.statSync(zipOutput);
  console.log(`\\n🎉 Deployment bundle created: embeddedindia.zip (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.log(`\\n⚠️ embeddedindia.zip was not created.`);
}
