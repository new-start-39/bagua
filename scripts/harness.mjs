#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const command = process.argv[2] ?? 'help';

const requiredFiles = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'README.md',
  'package.json',
  '.harness/config.json',
  '.agents/skills/README.md',
  'scripts/harness.mjs',
  'tests/harness.test.mjs'
];

function run(name, file, args = []) {
  console.log(`\n▶ ${name}`);
  execFileSync(file, args, { cwd: root, stdio: 'inherit' });
}

function doctor() {
  console.log('Harness doctor');
  console.log(`Project: ${root}`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  try {
    console.log(`Git: ${execFileSync('git', ['--version'], { encoding: 'utf8' }).trim()}`);
  } catch {
    console.error('Git: unavailable');
    process.exitCode = 1;
  }
  const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
  if (missing.length) {
    console.error(`Missing files: ${missing.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Required files: ${requiredFiles.length}/${requiredFiles.length} present`);
  }
}

function check() {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(readFileSync(join(root, '.harness/config.json'), 'utf8'));
  const failures = [];
  for (const file of requiredFiles) if (!existsSync(join(root, file))) failures.push(`missing ${file}`);
  for (const script of ['harness:doctor', 'harness:check', 'test', 'ci']) {
    if (!packageJson.scripts?.[script]) failures.push(`missing npm script ${script}`);
  }
  if (config.skillsDirectory !== '.agents/skills') failures.push('skills directory is misconfigured');
  if (!readFileSync(join(root, 'AGENTS.md'), 'utf8').includes('npm run ci')) failures.push('AGENTS.md lacks CI command');
  if (failures.length) {
    console.error(failures.map((failure) => `✗ ${failure}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('Harness configuration: OK');
}

switch (command) {
  case 'doctor': doctor(); break;
  case 'check': check(); break;
  case 'test': run('tests', process.execPath, ['--test']); break;
  case 'ci': doctor(); check(); if (!process.exitCode) run('tests', process.execPath, ['--test']); break;
  case 'help':
  default:
    console.log('Usage: npm run harness:<doctor|check> | npm test | npm run ci');
}
