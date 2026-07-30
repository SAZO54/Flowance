const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'docs', '06_api', 'openapi');
const targetDir = path.join(rootDir, 'static', 'openapi');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`OpenAPI source directory does not exist: ${sourceDir}`);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const fileName of fs.readdirSync(targetDir)) {
  if (/\.ya?ml$/i.test(fileName)) {
    fs.unlinkSync(path.join(targetDir, fileName));
  }
}

const copiedFiles = fs
  .readdirSync(sourceDir)
  .filter((fileName) => /\.ya?ml$/i.test(fileName))
  .sort();

for (const fileName of copiedFiles) {
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
}

console.log(`Synced ${copiedFiles.length} OpenAPI files to static/openapi`);
