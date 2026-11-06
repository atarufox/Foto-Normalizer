import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  const srcDir = path.resolve(__dirname, '../src');
  const outDir = path.resolve(__dirname, 'output');
  const nodeModulesDir = path.resolve(__dirname, 'node_modules');

  return {
    root: srcDir,
    base: './',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    resolve: {
      alias: [
        { find: '@', replacement: srcDir },
        { find: /^react$/, replacement: path.resolve(nodeModulesDir, 'react') },
        { find: /^react\/(.*)$/, replacement: path.resolve(nodeModulesDir, 'react/$1') },
        { find: /^react-dom$/, replacement: path.resolve(nodeModulesDir, 'react-dom') },
        { find: /^react-dom\/(.*)$/, replacement: path.resolve(nodeModulesDir, 'react-dom/$1') },
        { find: /^lucide-react$/, replacement: path.resolve(nodeModulesDir, 'lucide-react') },
        { find: /^lucide-react\/(.*)$/, replacement: path.resolve(nodeModulesDir, 'lucide-react/$1') },
        { find: /^tailwindcss$/, replacement: path.resolve(nodeModulesDir, 'tailwindcss') },
        { find: /^tailwindcss\/(.*)$/, replacement: path.resolve(nodeModulesDir, 'tailwindcss/$1') },
      ],
    },
    build: {
      outDir: outDir,
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
