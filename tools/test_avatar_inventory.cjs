#!/usr/bin/env node
/* Cross-layer regression: the rendered catalog must save through the real identity contract. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const ts = require('../apps/web/node_modules/typescript');

const repo = path.resolve(__dirname, '..');
function sourceModule(relativePath) {
  const code = ts.transpileModule(fs.readFileSync(path.join(repo, relativePath), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  // Both selected modules are repository-owned pure catalog/model sources. Type-only imports disappear.
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}

const ui = sourceModule('apps/web/src/features/avatar/avatarOptions.ts');
const server = sourceModule('apps/server/src/modules/identity/model.ts');
const { AVATAR_OPTIONS, DEFAULT_AVATAR, validateAvatar } = server;
let optionCount = 0;
let imageCount = 0;
const allIds = new Set();

assert.deepEqual(Object.keys(ui.OPTIONS).sort(), Object.keys(AVATAR_OPTIONS).sort());
for (const [slot, options] of Object.entries(ui.OPTIONS)) {
  assert.deepEqual(options.map((item) => item.id).sort(), [...AVATAR_OPTIONS[slot]].sort(), `${slot}: UI/server catalog drift`);
  assert.equal(new Set(options.map((item) => item.id)).size, options.length, `${slot}: duplicate options`);
  for (const item of options) {
    assert(!allIds.has(item.id), `Duplicate global semantic ID: ${item.id}`);
    allIds.add(item.id);
    assert.equal(validateAvatar({ ...DEFAULT_AVATAR, [slot]: item.id })[slot], item.id);
    assert(item.name.trim() && item.desc.trim(), `Missing accessible item text: ${item.id}`);
    if (item.image) {
      assert(/^\/assets\/items\/[a-z_]+\.png$/.test(item.image), `Non-local or invalid image path: ${item.id}`);
      const file = fs.readFileSync(path.join(repo, 'apps/web/public', item.image.slice(1)));
      assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Not a PNG: ${item.image}`);
      assert(file.readUInt32BE(16) > 0 && file.readUInt32BE(20) > 0, `Empty image: ${item.image}`);
      imageCount++;
    }
    optionCount++;
  }
}
for (const preset of ui.STYLE_PRESETS) validateAvatar({ ...DEFAULT_AVATAR, ...preset.avatar });
for (const slot of ui.EQUIPMENT_SLOTS) {
  assert(AVATAR_OPTIONS[slot.id], `Unknown equipment slot: ${slot.id}`);
  if (slot.empty) assert(AVATAR_OPTIONS[slot.id].includes(slot.empty), `Invalid remove-equipment value: ${slot.id}`);
  const actual = ui.INVENTORY_ITEMS.filter((item) => item.slot === slot.id);
  const expected = ui.OPTIONS[slot.id].filter((item) => item.id !== slot.empty);
  assert.deepEqual(actual.map((item) => item.id).sort(), expected.map((item) => item.id).sort());
  for (const item of actual) assert((item.image || item.iconLabel) && item.category === slot.category, `Missing equipment visual/category: ${item.id}`);
}
const reviewedReplacements = {
  'headwear.scarf': '/assets/items/scarf_reviewed.png',
  'headwear.goggles': '/assets/items/goggles_reviewed.png',
  'badge.meteo': '/assets/items/badge_meteo_reviewed.png',
  'badge.aerology': '/assets/items/badge_aerology_reviewed.png',
};
for (const [id, image] of Object.entries(reviewedReplacements)) {
  const item = ui.INVENTORY_ITEMS.find((entry) => entry.id === id);
  assert(item.iconLabel && item.image === image, `Unreviewed legacy artwork reintroduced: ${id}`);
}
assert.equal(new Set(ui.INVENTORY_ITEMS.map((item) => item.id)).size, ui.INVENTORY_ITEMS.length);
const result = { catalogParity: true, supportedSlots: Object.keys(AVATAR_OPTIONS).length, supportedValues: optionCount, inventoryItems: ui.INVENTORY_ITEMS.length, validImages: imageCount, validPresets: ui.STYLE_PRESETS.length };

async function freePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function apiPersistenceCheck() {
  assert(fs.existsSync(path.join(repo, 'apps/server/dist/index.js')), 'Build apps/server before running --api');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'synopsis-inventory-test-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const rosterPath = path.join(repo, 'config/test-roster.example.json');
  const rosterFixture = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const fixtureUsers = rosterFixture.groups[0].users;
  let child;
  async function start() {
    child = spawn(process.execPath, ['apps/server/dist/index.js'], {
      cwd: repo,
      env: { ...process.env, API_BIND: '127.0.0.1', API_PORT: String(port), SYNOPSIS_BOOTSTRAP_ADMIN_CODE: '', SYNOPSIS_SECURITY_PROFILE: 'trusted', SYNOPSIS_ENABLE_TEST_ROSTER: 'true', SYNOPSIS_TEST_ROSTER_FILE: rosterPath, SYNOPSIS_IDENTITY_STORE: path.join(temp, 'identity.json'), SYNOPSIS_PROGRESSION_STORE: path.join(temp, 'progression.json'), SYNOPSIS_ATTEMPT_LOG: path.join(temp, 'attempts.jsonl'), SYNOPSIS_CONTENT_ROOT: path.join(repo, 'content') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test API startup timed out')), 15000);
      child.stdout.on('data', (chunk) => { if (String(chunk).includes(base)) { clearTimeout(timer); resolve(); } });
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Test API exited: ${code}`)); });
    });
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  async function request(route, method = 'GET', body, token) {
    const response = await fetch(base + route, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    await start();
    const roster = (await request(`/api/identity/roster?group=${encodeURIComponent(rosterFixture.groups[0].groupId)}`)).body.users;
    const user = roster.find((entry) => entry.displayName === fixtureUsers[0].displayName);
    const other = roster.find((entry) => entry.displayName === fixtureUsers[1].displayName);
    const login = (await request('/api/identity/login', 'POST', { userId: user.id, code: fixtureUsers[0].code })).body;
    const token = login.token;
    assert(token, 'Normal test-roster login must return a session');
    for (const [slot, options] of Object.entries(ui.OPTIONS)) for (const item of options) {
      const saved = await request('/api/identity/avatar', 'PATCH', { avatar: { ...DEFAULT_AVATAR, [slot]: item.id } }, token);
      assert.equal(saved.status, 200, `API rejected advertised choice: ${item.id}`);
    }
    const outfit = { ...DEFAULT_AVATAR, ...ui.STYLE_PRESETS[1].avatar, skinTone: 'skin.deep' };
    assert.equal((await request('/api/identity/avatar', 'PATCH', { avatar: outfit }, token)).status, 200);
    assert.equal((await request('/api/identity/avatar', 'PATCH', { avatar: { ...outfit, top: 'top.not-in-catalog' } }, token)).status, 400);
    assert.equal((await request('/api/identity/avatar', 'PATCH', { avatar: outfit })).status, 401);
    assert.deepEqual((await request('/api/identity/me', 'GET', undefined, token)).body.user.avatar, outfit);
    await stop();
    await start();
    const freshLogin = await request('/api/identity/login', 'POST', { userId: user.id, code: fixtureUsers[0].code });
    assert.equal(freshLogin.status, 200);
    assert.deepEqual(freshLogin.body.user.avatar, outfit, 'Outfit must survive a real API process restart');
    const otherLogin = await request('/api/identity/login', 'POST', { userId: other.id, code: fixtureUsers[1].code });
    assert.deepEqual(otherLogin.body.user.avatar, DEFAULT_AVATAR, 'Another account must retain its own outfit');
    return { allCatalogValuesAccepted: true, persistedAcrossServerRestart: true, anotherAccountUnchanged: true, invalidIdRejected: true, anonymousSaveRejected: true };
  } finally { await stop(); fs.rmSync(temp, { recursive: true, force: true }); }
}

(async () => {
  if (process.argv.includes('--api')) result.api = await apiPersistenceCheck();
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
