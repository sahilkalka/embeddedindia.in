// scripts/pack-cpanel.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 [1/3] Compiling Tailwind production stylesheet...');
try {
  execSync('npm run build:css', { stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ CSS build warning:', e.message);
}

console.log('📦 [2/3] Generating Prisma Client artifacts...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ Prisma generate warning:', e.message);
}

const rootDir = path.resolve(__dirname, '..');
const zipOutput = path.join(rootDir, 'embeddedindia-cpanel-deploy.zip');
const tarOutput = path.join(rootDir, 'embeddedindia-cpanel-deploy.tar.gz');

console.log('📦 [3/3] Creating deployment package archives (ZIP & TAR.GZ)...');

const pythonZipScript = `
import zipfile, os

output_zip = r"${zipOutput}"
root_dir = r"${rootDir}"

exclude_dirs = {
    'node_modules', '.git', '.gemini', 'tests', '.vscode', '.idea', 'coverage'
}
exclude_files = {
    'embeddedindia-cpanel-deploy.zip',
    'embeddedindia-cpanel-deploy.tar.gz',
    '.env',
    'dev.db-journal'
}

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for foldername, subfolders, filenames in os.walk(root_dir):
        # Exclude directories
        subfolders[:] = [d for d in subfolders if d not in exclude_dirs]
        for filename in filenames:
            if filename in exclude_files:
                continue
            filepath = os.path.join(foldername, filename)
            arcname = os.path.relpath(filepath, root_dir)
            zf.write(filepath, arcname)

print("ZIP package generated successfully.")
`;

try {
  fs.writeFileSync(path.join(rootDir, 'temp_zip_script.py'), pythonZipScript);
  execSync(`python3 "${path.join(rootDir, 'temp_zip_script.py')}"`, { stdio: 'inherit' });
  fs.unlinkSync(path.join(rootDir, 'temp_zip_script.py'));
  const zipSizeMb = (fs.statSync(zipOutput).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Ready: embeddedindia-cpanel-deploy.zip (${zipSizeMb} MB)`);
} catch (err) {
  console.warn('Could not generate zip via Python, fallback to tar:', err.message);
}

try {
  execSync(`tar --exclude="node_modules" --exclude=".git" --exclude="tests" --exclude="embeddedindia-cpanel-deploy.*" -czf "${tarOutput}" -C "${rootDir}" .`, { stdio: 'inherit' });
  const tarSizeMb = (fs.statSync(tarOutput).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Ready: embeddedindia-cpanel-deploy.tar.gz (${tarSizeMb} MB)`);
} catch (err) {
  console.warn('Tar packing warning:', err.message);
}

console.log('\n🚀 Deployment archives are ready in project root!');
console.log('Follow the detailed steps in DEPLOYMENT_CPANEL_GUIDE.md to upload and run on cPanel.');
