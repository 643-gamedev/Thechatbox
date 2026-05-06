#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const BASE44_PATTERNS = [
  /@\/api\/base44Client/g,
  /@base44\//g,
  /__B44_DB__/g,
  /VITE_BASE44_[A-Z0-9_]+/g,
  /\bbase44\b/gi,
];

const IMPORT_PATHS = [
  'src',
  'public',
  'entities',
  'index.html',
  'components.json',
  'jsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'eslint.config.js',
];

function parseArgs(argv) {
  const args = {
    zip: null,
    repo: process.cwd(),
    dryRun: false,
    commit: false,
    push: false,
    branch: 'main',
    message: 'sync: import latest Base44 export and sanitize',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--zip') args.zip = argv[++i];
    else if (token === '--repo') args.repo = argv[++i];
    else if (token === '--branch') args.branch = argv[++i];
    else if (token === '--message') args.message = argv[++i];
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--commit') args.commit = true;
    else if (token === '--push') args.push = true;
    else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.zip) {
    console.error('Error: --zip is required');
    printHelp();
    process.exit(1);
  }

  if (args.push) args.commit = true;
  return args;
}

function printHelp() {
  console.log(`base44-sync usage:
  node tools/base44-sync.mjs --zip /path/Thechatbox.zip [options]

Options:
  --repo <path>        Target repository (default: current dir)
  --dry-run            Print actions without writing files
  --commit             Create git commit after import
  --push               Push commit to remote (implies --commit)
  --branch <name>      Branch for push (default: main)
  --message <text>     Commit message
`);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${cmd} ${args.join(' ')} failed\n${detail}`);
  }
  return result.stdout;
}

async function exists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function listDir(target) {
  return fsp.readdir(target, { withFileTypes: true });
}

async function detectExportRoot(extractDir) {
  const entries = await listDir(extractDir);
  const dirs = entries.filter((entry) => entry.isDirectory());

  if (dirs.length === 1) {
    const candidate = path.join(extractDir, dirs[0].name);
    if (await exists(path.join(candidate, 'src'))) {
      return candidate;
    }
  }

  if (await exists(path.join(extractDir, 'src'))) {
    return extractDir;
  }

  for (const dir of dirs) {
    const candidate = path.join(extractDir, dir.name);
    if (await exists(path.join(candidate, 'src'))) {
      return candidate;
    }
  }

  throw new Error('Could not find extracted app root containing src/');
}

async function removePath(target, dryRun) {
  if (!(await exists(target))) return;
  if (dryRun) return;
  await fsp.rm(target, { recursive: true, force: true });
}

async function copyPath(source, target, dryRun) {
  const stat = await fsp.stat(source);
  if (stat.isDirectory()) {
    if (!dryRun) await fsp.mkdir(target, { recursive: true });
    const entries = await listDir(source);
    for (const entry of entries) {
      await copyPath(path.join(source, entry.name), path.join(target, entry.name), dryRun);
    }
    return;
  }

  if (!dryRun) {
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.copyFile(source, target);
  }
}

function sanitizeText(content) {
  let next = content;

  next = next
    .split('\n')
    .filter((line) => !line.includes('globalThis.__B44_DB__'))
    .join('\n');

  next = next.replace(/@\/api\/base44Client/g, '@/api/chatboxClient');
  next = next.replace(/`base44_/g, '`thechatbox_');
  next = next.replace(/'base44_/g, "'thechatbox_");
  next = next.replace(/\"base44_/g, '"thechatbox_');
  next = next.replace(/\bVITE_BASE44_[A-Z0-9_]+\b/g, '');

  return next;
}

async function sanitizeFile(target, dryRun) {
  const raw = await fsp.readFile(target, 'utf8');
  const cleaned = sanitizeText(raw);
  if (cleaned !== raw && !dryRun) {
    await fsp.writeFile(target, cleaned, 'utf8');
  }
}

async function sanitizeTree(root, dryRun) {
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.pop();
    const stat = await fsp.stat(current);

    if (stat.isDirectory()) {
      const entries = await listDir(current);
      for (const entry of entries) queue.push(path.join(current, entry.name));
      continue;
    }

    const ext = path.extname(current).toLowerCase();
    const textLike = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.md', '.toml', '.yml', '.yaml', ''];
    if (textLike.includes(ext)) {
      await sanitizeFile(current, dryRun);
    }
  }
}

async function findResidualBase44(root) {
  const hits = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.pop();
    const stat = await fsp.stat(current);

    if (stat.isDirectory()) {
      const entries = await listDir(current);
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        queue.push(path.join(current, entry.name));
      }
      continue;
    }

    const ext = path.extname(current).toLowerCase();
    const textLike = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.md', '.toml', '.yml', '.yaml', ''];
    if (!textLike.includes(ext)) continue;

    const raw = await fsp.readFile(current, 'utf8');
    for (const pattern of BASE44_PATTERNS) {
      if (pattern.test(raw)) {
        hits.push(path.relative(root, current));
        break;
      }
    }
  }

  return hits;
}

function ensureGitRepo(repo) {
  const gitDir = path.join(repo, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Target is not a git repo: ${repo}`);
  }
}

function gitHasChanges(repo) {
  const out = run('git', ['status', '--porcelain'], { cwd: repo });
  return out.trim().length > 0;
}

function gitCommitAndPush(repo, { message, push, branch }) {
  run('git', ['add', '.'], { cwd: repo });
  run('git', ['commit', '-m', message], { cwd: repo });
  if (push) {
    run('git', ['push', 'origin', branch], { cwd: repo });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = path.resolve(args.repo);
  const zipFile = path.resolve(args.zip);

  ensureGitRepo(repo);

  if (!(await exists(zipFile))) {
    throw new Error(`Zip file not found: ${zipFile}`);
  }

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'base44-sync-'));
  const extractDir = path.join(tempRoot, 'export');

  await fsp.mkdir(extractDir, { recursive: true });
  run('unzip', ['-o', zipFile, '-d', extractDir]);

  const exportRoot = await detectExportRoot(extractDir);

  const actions = [];

  for (const rel of IMPORT_PATHS) {
    const source = path.join(exportRoot, rel);
    const target = path.join(repo, rel);

    if (!(await exists(source))) continue;

    actions.push(`sync ${rel}`);
    await removePath(target, args.dryRun);
    await copyPath(source, target, args.dryRun);
  }

  await sanitizeTree(repo, args.dryRun);

  const residual = await findResidualBase44(repo);

  console.log('Base44 sync completed.');
  console.log(`Repo: ${repo}`);
  console.log(`Zip : ${zipFile}`);
  console.log('Actions:');
  for (const action of actions) console.log(`  - ${action}`);

  if (residual.length > 0) {
    console.log('Residual base44 references found:');
    for (const hit of residual) console.log(`  - ${hit}`);
  } else {
    console.log('No residual base44 references found.');
  }

  if (args.dryRun) {
    console.log('Dry run mode: no changes written.');
    return;
  }

  if (args.commit) {
    if (!gitHasChanges(repo)) {
      console.log('No git changes to commit.');
      return;
    }
    gitCommitAndPush(repo, {
      message: args.message,
      push: args.push,
      branch: args.branch,
    });
    console.log(args.push ? 'Committed and pushed.' : 'Committed.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
