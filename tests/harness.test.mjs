import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('baseline harness files exist', () => {
  for (const file of ['AGENTS.md', 'ARCHITECTURE.md', '.harness/config.json', '.agents/skills/README.md']) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test('agent instructions expose the verification contract', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /npm run harness:doctor/);
  assert.match(agents, /npm run harness:check/);
  assert.match(agents, /npm test/);
  assert.match(agents, /npm run ci/);
});

test('agent instructions expose personal coding preferences', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Prefer arrow functions/);
  assert.match(agents, /Prefer `async`\/`await`/);
  assert.match(agents, /\.then\(\)/);
  assert.match(agents, /\.catch\(\)/);
});

test('harness configuration points to the reserved skills directory', () => {
  const config = JSON.parse(readFileSync(join(root, '.harness/config.json'), 'utf8'));
  assert.equal(config.skillsDirectory, '.agents/skills');
  assert.deepEqual(config.verification.required, [
    'harness:doctor',
    'harness:check',
    'test',
    'test:components',
    'build'
  ]);
});

test('Vercel keeps API traffic same-origin before applying the SPA fallback', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  assert.deepEqual(vercel.rewrites, [
    {
      source: '/api/:path*',
      destination: 'https://bagua-koa.whan.uk/api/:path*'
    },
    {
      source: '/(.*)',
      destination: '/index.html'
    }
  ]);

  const headers = Object.fromEntries(
    vercel.headers[0].headers.map(({ key, value }) => [key, value])
  );
  assert.match(headers['Content-Security-Policy'], /connect-src 'self'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
});
