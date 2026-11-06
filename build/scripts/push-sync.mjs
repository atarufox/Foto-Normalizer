import { pushFiles } from './github-sync.mjs';

const files = [
  // Root files
  { localPath: '.gitignore', repoPath: '.gitignore' },
  { localPath: 'README.md', repoPath: 'README.md' },

  // Source files (src/)
  { localPath: 'src/index.html', repoPath: 'src/index.html' },
  { localPath: 'src/index.css', repoPath: 'src/index.css' },
  { localPath: 'src/main.tsx', repoPath: 'src/main.tsx' },
  { localPath: 'src/App.tsx', repoPath: 'src/App.tsx' },
  { localPath: 'src/types/index.ts', repoPath: 'src/types/index.ts' },
  { localPath: 'src/components/FileActionToolbar.tsx', repoPath: 'src/components/FileActionToolbar.tsx' },
  { localPath: 'src/components/Header.tsx', repoPath: 'src/components/Header.tsx' },
  { localPath: 'src/components/PhotoPreviewModal.tsx', repoPath: 'src/components/PhotoPreviewModal.tsx' },
  { localPath: 'src/components/PhotoTable.tsx', repoPath: 'src/components/PhotoTable.tsx' },
  { localPath: 'src/components/RollbackModal.tsx', repoPath: 'src/components/RollbackModal.tsx' },
  { localPath: 'src/components/StatsBar.tsx', repoPath: 'src/components/StatsBar.tsx' },
  { localPath: 'src/components/VersionHistoryModal.tsx', repoPath: 'src/components/VersionHistoryModal.tsx' },
  { localPath: 'src/lib/jpegParser.ts', repoPath: 'src/lib/jpegParser.ts' },
  { localPath: 'src/lib/renameEngine.ts', repoPath: 'src/lib/renameEngine.ts' },

  // Build tools & configs (build/)
  { localPath: 'build/package.json', repoPath: 'build/package.json' },
  { localPath: 'build/vite.config.ts', repoPath: 'build/vite.config.ts' },
  { localPath: 'build/tsconfig.json', repoPath: 'build/tsconfig.json' },
  { localPath: 'build/.env.example', repoPath: 'build/.env.example' },
  { localPath: 'build/AVVIA_FOTO_NORMALIZER.bat', repoPath: 'build/AVVIA_FOTO_NORMALIZER.bat' },
  { localPath: 'build/avvia_foto_normalizer.sh', repoPath: 'build/avvia_foto_normalizer.sh' },
  { localPath: 'build/build.bat', repoPath: 'build/build.bat' },
  { localPath: 'build/build.sh', repoPath: 'build/build.sh' },
  { localPath: 'build/scripts/build.mjs', repoPath: 'build/scripts/build.mjs' },
  { localPath: 'build/scripts/github-sync.mjs', repoPath: 'build/scripts/github-sync.mjs' },
  { localPath: 'build/scripts/push-sync.mjs', repoPath: 'build/scripts/push-sync.mjs' },
];

async function main() {
  console.log(`Starting push of ${files.length} files for v0.8.0...`);
  const commit = await pushFiles(files, 'refactor: v0.8.0 - modular root reorganization (src/ & build/ separation)');
  console.log('Resulting commit:', commit.sha);
}

main().catch(err => {
  console.error('Push failed:', err);
  process.exit(1);
});
