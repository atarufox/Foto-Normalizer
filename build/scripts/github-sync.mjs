import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(buildDir, '..');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const OWNER = 'atarufox';
const REPO = 'Foto-Normalizer';
const BRANCH = 'main';

function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const buildEnv = path.join(buildDir, '.env.local');
  if (fs.existsSync(buildEnv)) {
    const content = fs.readFileSync(buildEnv, 'utf8');
    const match = content.match(/GITHUB_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  const rootEnv = path.join(repoRoot, '.env.local');
  if (fs.existsSync(rootEnv)) {
    const content = fs.readFileSync(rootEnv, 'utf8');
    const match = content.match(/GITHUB_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

const token = getGithubToken();
if (!token) {
  console.error('Error: GITHUB_TOKEN not found in environment or .env.local');
  process.exit(1);
}

const headers = {
  'Accept': 'application/vnd.github+json',
  'Authorization': `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'Foto-Normalizer-Sync'
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error [${res.status} ${res.statusText}]: ${errorText}`);
  }
  return res.json();
}

export async function pushFiles(fileEntries, commitMessage) {
  // fileEntries: Array of { localPath, repoPath } (localPath can be relative to repoRoot or absolute)
  console.log(`📡 Fetching current HEAD for branch '${BRANCH}'...`);
  const refData = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const parentCommitSha = refData.object.sha;

  console.log(`📡 Fetching tree for commit ${parentCommitSha}...`);
  const commitData = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${parentCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  const treePayload = [];

  for (const entry of fileEntries) {
    let contentBase64;
    const resolvedPath = path.isAbsolute(entry.localPath)
      ? entry.localPath
      : path.resolve(repoRoot, entry.localPath);

    if (fs.existsSync(resolvedPath)) {
      const buffer = fs.readFileSync(resolvedPath);
      contentBase64 = buffer.toString('base64');
    } else if (entry.content) {
      contentBase64 = Buffer.from(entry.content, 'utf8').toString('base64');
    } else {
      console.warn(`⚠️ Warning: local file not found: ${resolvedPath}`);
      continue;
    }

    console.log(`📤 Uploading blob for ${entry.repoPath}...`);
    const blobData = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: contentBase64,
        encoding: 'base64'
      })
    });

    treePayload.push({
      path: entry.repoPath,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    });
  }

  console.log(`🌳 Creating new tree...`);
  const newTreeData = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treePayload
    })
  });

  console.log(`✍️ Creating commit...`);
  const newCommitData = await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: commitMessage,
      tree: newTreeData.sha,
      parents: [parentCommitSha]
    })
  });

  console.log(`🚀 Updating branch reference '${BRANCH}' to commit ${newCommitData.sha}...`);
  await fetchJson(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommitData.sha,
      force: false
    })
  });

  console.log(`✅ Commit successfully pushed!`);
  console.log(`🔗 URL: ${newCommitData.html_url}`);
  return newCommitData;
}
