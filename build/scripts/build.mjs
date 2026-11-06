import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, '..');
process.chdir(buildDir);

console.log('Build directory:', buildDir);
console.log('Running Vite build for Foto Normalizer...');

const nodeExe = process.execPath;
const viteBin = path.join(buildDir, 'node_modules', 'vite', 'bin', 'vite.js');

execSync(`"${nodeExe}" "${viteBin}" build --config vite.config.ts`, {
  stdio: 'inherit',
});

const outputIndex = path.join(buildDir, 'output', 'index.html');
const outputStandalone = path.join(buildDir, 'output', 'Foto_Normalizer_Standalone.html');

if (fs.existsSync(outputIndex)) {
  fs.copyFileSync(outputIndex, outputStandalone);
  console.log('✅ Standalone bundle successfully generated in output directory:');
  console.log('   ->', outputStandalone);
  console.log('   Size:', fs.statSync(outputStandalone).size, 'bytes');
} else {
  console.error('❌ Build output index.html not found in build/output/');
  process.exit(1);
}
