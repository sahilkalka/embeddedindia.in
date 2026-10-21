// scripts/pack-bundle.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const zipOutput = path.join(rootDir, 'embeddedindia.zip');

console.log('📦 [1/3] Building Tailwind production CSS stylesheet...');
try {
  execSync('npm run build:css', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ CSS build notice:', e.message);
}

console.log('📦 [2/3] Preparing deployment bundle structure...');
// Remove old zip if present
if (fs.existsSync(zipOutput)) {
  fs.unlinkSync(zipOutput);
}

// Generate bundle using python zipfile with "embeddedindia" as root folder
const pythonScript = `
import zipfile
import os

output_zip = r"${zipOutput}"
root_dir = r"${rootDir}"
prefix = "embeddedindia"

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
    'temp_zip_script.py',
    'temp_bundle_script.py'
}

exclude_extensions = {
    '.log'
}

total_files = 0
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for foldername, subfolders, filenames in os.walk(root_dir):
        # Exclude directories in-place
        subfolders[:] = [d for d in subfolders if d not in exclude_dirs]
        
        for filename in filenames:
            if filename in exclude_files:
                continue
            _, ext = os.path.splitext(filename)
            if ext in exclude_extensions:
                continue
            
            filepath = os.path.join(foldername, filename)
            relpath = os.path.relpath(filepath, root_dir)
            arcname = os.path.join(prefix, relpath).replace('\\\\', '/')
            
            zf.write(filepath, arcname)
            total_files += 1

print(f"Packed {total_files} files into {output_zip} with root '{prefix}/'.")
`;

const tempScriptPath = path.join(rootDir, 'temp_bundle_script.py');
fs.writeFileSync(tempScriptPath, pythonScript, 'utf8');

console.log('📦 [3/3] Compressing into embeddedindia.zip archive...');
try {
  execSync(`python "${tempScriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
} finally {
  if (fs.existsSync(tempScriptPath)) {
    fs.unlinkSync(tempScriptPath);
  }
}

if (fs.existsSync(zipOutput)) {
  const stats = fs.statSync(zipOutput);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Successfully generated deployment bundle: embeddedindia.zip (${sizeMb} MB)`);
  console.log(`📁 Top-level root folder inside zip: embeddedindia/`);
  console.log(`🚀 Starting application file: embeddedindia/app.js`);
} else {
  console.error('❌ Failed to generate embeddedindia.zip');
  process.exit(1);
}
