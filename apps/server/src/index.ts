import fs from 'node:fs';
import os from 'node:os';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IdentityError,
  IdentityService,
  type BatchCreateUsersInput,
  type CreateUserInput,
} from './modules/identity/identityService.js';
import type { UserStatus } from './modules/identity/model.js';
import { ShiftError, ShiftService } from './modules/shift/shiftService.js';
import { EquipmentService } from './modules/equipment/equipmentService.js';
import { EquipmentError } from './modules/equipment/model.js';
import { rejectUnverifiedClientProgressionWrite } from './modules/progression/progressionMutationPolicy.js';
import {
  ProgressionError,
  ProgressionService,
} from './modules/progression/progressionService.js';

const HOST = process.env.API_BIND ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? process.env.SYNOPSIS_SERVER_PORT ?? 8787);
const STORE_PATH = process.env.SYNOPSIS_IDENTITY_STORE ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/var/lib/synopsis-game/data/identity.json' : resolve(process.cwd(), '.local/identity.json'));
const SECURITY_PROFILE = process.env.SYNOPSIS_SECURITY_PROFILE === 'trusted' ? 'trusted' : 'public';
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = process.env.SYNOPSIS_CONTENT_ROOT ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/opt/synopsis-game/current/content' : resolve(MODULE_DIR, '../../../content'));
const AVATAR_ASSETS_ROOT = process.env.SYNOPSIS_AVATAR_ASSETS_ROOT ?? resolve(MODULE_DIR,
  process.env.SYNOPSIS_VERSION_FILE ? '../web/assets/avatar/modular-r01' : '../../web/public/assets/avatar/modular-r01');
const ATTEMPT_LOG_PATH = process.env.SYNOPSIS_ATTEMPT_LOG ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/var/lib/synopsis-game/data/attempts.jsonl' : resolve(MODULE_DIR, '../.local/attempts.jsonl'));
const PROGRESSION_STORE = process.env.SYNOPSIS_PROGRESSION_STORE ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/var/lib/synopsis-game/data/progression.json' : resolve(process.cwd(), '.local/progression.json'));
const EQUIPMENT_STORE = process.env.SYNOPSIS_EQUIPMENT_STORE ?? resolve(dirname(STORE_PATH), 'equipment.json');
const startedAt = new Date().toISOString();
const version = process.env.SYNOPSIS_VERSION ?? (() => {
  try {
    return fs.readFileSync(process.env.SYNOPSIS_VERSION_FILE ?? '/opt/synopsis-game/current/VERSION', 'utf8').trim();
  } catch {
    return 'dev';
  }
})();

const identity = new IdentityService({ storePath: STORE_PATH, securityProfile: SECURITY_PROFILE, avatarAssetsRoot: AVATAR_ASSETS_ROOT });
await identity.init();
const equipment = new EquipmentService({ storePath: EQUIPMENT_STORE });
const shifts = new ShiftService({ contentRoot: CONTENT_ROOT, attemptLogPath: ATTEMPT_LOG_PATH, equipment, avatarAssetsRoot: AVATAR_ASSETS_ROOT });
await shifts.init();
const progression = new ProgressionService({ storePath: PROGRESSION_STORE });
await progression.loadState();

const bootstrapCode = process.env.SYNOPSIS_BOOTSTRAP_ADMIN_CODE;
if (bootstrapCode) {
  const created = await identity.bootstrapAdmin(process.env.SYNOPSIS_BOOTSTRAP_ADMIN_NAME ?? 'Администратор', bootstrapCode);
  if (created) console.info('Создан первоначальный администратор. Bootstrap-код больше не нужен.');
} else if (!identity.hasAdmin()) {
  console.warn('Администратор не создан. Для первого запуска задайте SYNOPSIS_BOOTSTRAP_ADMIN_CODE.');
}

if (process.env.SYNOPSIS_ENABLE_TEST_ROSTER === 'true' || process.env.SYNOPSIS_ENABLE_TEST_ROSTER === '1') {
  const { seedTestRoster } = await import('./modules/identity/testRoster.js');
  const result = await seedTestRoster(identity, { securityProfile: SECURITY_PROFILE, enabled: true });
  if (result.seeded) {
    console.info(`[testRoster] Загружен тестовый ростер для e2e: ${result.count} записей.`);
  }
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 32_768) throw new IdentityError(413, 'Запрос слишком велик', 'payload_too_large');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ожидался JSON-объект');
    return value as Record<string, unknown>;
  } catch {
    throw new IdentityError(400, 'Некорректный JSON', 'invalid_json');
  }
}

function bearer(request: IncomingMessage): string {
  const value = request.headers.authorization;
  if (!value?.startsWith('Bearer ')) throw new IdentityError(401, 'Требуется сессия', 'session_required');
  return value.slice('Bearer '.length);
}

function clientIp(request: IncomingMessage): string {
  return request.socket.remoteAddress ?? 'unknown';
}

const server = createServer(async (request, response) => {
  try {
    if (!request.url || !request.method) throw new IdentityError(400, 'Некорректный запрос', 'bad_request');
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (request.method === 'GET' && (path === '/health' || path === '/api/health')) {
      sendJson(response, 200, { status: 'ok', service: 'synopsis-server', version, startedAt });
      return;
    }
    if (request.method === 'GET' && (path === '/ready' || path === '/api/ready')) {
      sendJson(response, 200, {
        status: 'ready', version, hostname: os.hostname(), configSchema: Number(process.env.CONFIG_SCHEMA_VERSION ?? '1'),
      });
      return;
    }
    if (request.method === 'GET' && path === '/api/runtime-config') {
      sendJson(response, 200, {
        version,
        publicUrl: process.env.PUBLIC_URL ?? '',
        websocketPath: process.env.WS_PATH ?? '/ws',
        mapsProvider: process.env.MAPS_PROVIDER ?? 'none',
        mapsBaseUrl: process.env.MAPS_BASE_URL ?? '',
        kn01Transport: process.env.KN01_TRANSPORT ?? 'file',
      });
      return;
    }
    if (request.method === 'GET' && path === '/api/identity/groups') {
      sendJson(response, 200, { groups: identity.listGroups() });
      return;
    }
    if (request.method === 'GET' && path === '/api/identity/roster') {
      sendJson(response, 200, { users: identity.listRoster(url.searchParams.get('group') ?? '') });
      return;
    }
    if (request.method === 'POST' && path === '/api/identity/login') {
      const body = await readJson(request);
      sendJson(response, 200, await identity.login(String(body.userId ?? ''), String(body.code ?? ''), clientIp(request)));
      return;
    }
    if (request.method === 'POST' && path === '/api/admin/login') {
      const body = await readJson(request);
      sendJson(response, 200, await identity.adminLogin(String(body.code ?? ''), clientIp(request)));
      return;
    }
    if (request.method === 'POST' && path === '/api/identity/set-code') {
      const body = await readJson(request);
      sendJson(response, 200, {
        user: await identity.setUserCode(
          bearer(request),
          String(body.newCode ?? ''),
          body.currentCode ? String(body.currentCode) : undefined,
        ),
      });
      return;
    }
    if (request.method === 'POST' && path === '/api/identity/logout') {
      identity.logout(bearer(request));
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method === 'GET' && path === '/api/identity/me') {
      sendJson(response, 200, { user: identity.me(bearer(request)) });
      return;
    }
    if (request.method === 'GET' && path === '/api/identity/avatar/catalog') {
      sendJson(response, 200, { catalog: identity.getAvatarCatalog() });
      return;
    }
    if (request.method === 'PATCH' && path === '/api/identity/avatar') {
      const body = await readJson(request);
      sendJson(response, 200, { user: await identity.updateAvatar(bearer(request), body.avatar) });
      return;
    }

    if (request.method === 'GET' && path === '/api/equipment') {
      const user = identity.me(bearer(request));
      sendJson(response, 200, equipment.getEquipment(user.id, user.avatar));
      return;
    }
    if (request.method === 'PATCH' && path === '/api/equipment/loadout') {
      const user = identity.me(bearer(request));
      const body = await readJson(request);
      sendJson(response, 200, await equipment.setLoadout(user.id, body.badgeId, user.avatar));
      return;
    }

    if (request.method === 'GET' && path === '/api/blitz-practice') {
      const user = identity.me(bearer(request));
      sendJson(response, 200, await shifts.blitzLobby(user.id));
      return;
    }
    if (request.method === 'POST' && path === '/api/blitz-practice') {
      const user = identity.me(bearer(request));
      const body = await readJson(request);
      sendJson(response, 201, await shifts.startBlitz(user.id, user.avatar, body.requestId, user.avatarPortrait));
      return;
    }
    const blitzMatch = path.match(/^\/api\/blitz-practice\/([^/]+)(\/answer)?$/);
    if (blitzMatch && (request.method === 'GET' && !blitzMatch[2] || request.method === 'POST' && blitzMatch[2])) {
      const user = identity.me(bearer(request));
      const blitzId = decodeURIComponent(blitzMatch[1]);
      if (request.method === 'GET') sendJson(response, 200, await shifts.getBlitz(user.id, blitzId));
      else {
        const body = await readJson(request);
        sendJson(response, 200, await shifts.submitBlitzAnswer(user.id, blitzId, typeof body.instanceId === 'string' ? body.instanceId : '', body.answer));
      }
      return;
    }

    if (request.method === 'POST' && path === '/api/shifts') {
      const user = identity.me(bearer(request));
      sendJson(response, 201, await shifts.startShift(user.id, user.avatar, user.avatarPortrait));
      return;
    }
    const shiftEffectMatch = path.match(/^\/api\/shifts\/([^/]+)\/(reference|reveal)$/);
    if (request.method === 'POST' && shiftEffectMatch) {
      const user = identity.me(bearer(request));
      const body = await readJson(request);
      const shiftId = decodeURIComponent(shiftEffectMatch[1]);
      const instanceId = typeof body.instanceId === 'string' ? body.instanceId : '';
      sendJson(response, 200, shiftEffectMatch[2] === 'reference'
        ? await shifts.openReference(user.id, shiftId, instanceId)
        : await shifts.revealAnswer(user.id, shiftId, instanceId));
      return;
    }
    const shiftTaskMatch = path.match(/^\/api\/shifts\/([^/]+)\/task$/);
    if (request.method === 'GET' && shiftTaskMatch) {
      const user = identity.me(bearer(request));
      sendJson(response, 200, shifts.getCurrentTask(user.id, decodeURIComponent(shiftTaskMatch[1])));
      return;
    }
    const taskAnswerMatch = path.match(/^\/api\/tasks\/([^/]+)\/answer$/);
    if (request.method === 'POST' && taskAnswerMatch) {
      const user = identity.me(bearer(request));
      const body = await readJson(request);
      sendJson(response, 200, await shifts.submitAnswer(
        user.id,
        String(body.shiftId ?? ''),
        decodeURIComponent(taskAnswerMatch[1]),
        body.answer,
        body.attempt ?? 1,
      ));
      return;
    }
    const shiftResultMatch = path.match(/^\/api\/shifts\/([^/]+)\/result$/);
    if (request.method === 'GET' && shiftResultMatch) {
      const user = identity.me(bearer(request));
      sendJson(response, 200, shifts.getResult(user.id, decodeURIComponent(shiftResultMatch[1])));
      return;
    }

    if (request.method === 'GET' && path === '/api/admin/users') {
      sendJson(response, 200, { users: identity.listUsers(bearer(request)) });
      return;
    }
    if (request.method === 'GET' && path === '/api/shifts') {
      const user = identity.me(bearer(request));
      sendJson(response, 200, { progression: progression.getProgression(user.id) });
      return;
    }
    if (request.method === 'GET' && path === '/api/progression') {
      const user = identity.me(bearer(request));
      sendJson(response, 200, { progression: progression.getProgression(user.id) });
      return;
    }
    if (request.method === 'GET' && path === '/api/progression/exam-eligibility') {
      const user = identity.me(bearer(request));
      sendJson(response, 200, progression.checkExamEligibility(user.id));
      return;
    }
    if (request.method === 'POST' && (path === '/api/progression/shift' || path === '/api/progression/exam')) {
      // Публичный клиент не может передать себе правильность и награды.
      // Пока нет сервера, выдающего проверенные результаты смен/экзамена,
      // этот путь всегда закрыт. Существующий ShiftService остаётся доступен.
      identity.me(bearer(request));
      rejectUnverifiedClientProgressionWrite();
    }
    if (request.method === 'GET' && path === '/api/progression/errors') {
      const user = identity.me(bearer(request));
      const unresolvedOnly = url.searchParams.get('unresolvedOnly') === 'true';
      sendJson(response, 200, { errors: progression.getErrorJournal(user.id, { unresolvedOnly }) });
      return;
    }

    if (request.method === 'POST' && path === '/api/admin/users') {
      const body = await readJson(request);
      const input: CreateUserInput = {
        displayName: String(body.displayName ?? ''),
        groupId: String(body.groupId ?? ''),
        roles: Array.isArray(body.roles) ? (body.roles as CreateUserInput['roles']) : [],
        initialCode: typeof body.initialCode === 'string' && body.initialCode.trim().length > 0 ? body.initialCode.trim() : undefined,
      };
      sendJson(response, 201, { user: await identity.createUser(bearer(request), input) });
      return;
    }
    if (request.method === 'POST' && path === '/api/admin/users/batch') {
      const body = await readJson(request);
      const input: BatchCreateUsersInput = {
        groupId: String(body.groupId ?? ''),
        roles: Array.isArray(body.roles) ? body.roles as BatchCreateUsersInput['roles'] : undefined,
        users: Array.isArray(body.users)
          ? (body.users as Array<Record<string, unknown>>).map((u) => ({
              displayName: String(u.displayName ?? ''),
              initialCode: typeof u.initialCode === 'string' && u.initialCode.trim().length > 0 ? u.initialCode.trim() : undefined,
            }))
          : [],
      };
      const result = await identity.batchCreateUsers(bearer(request), input);
      sendJson(response, 201, result);
      return;
    }
    const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && statusMatch) {
      const body = await readJson(request);
      sendJson(response, 200, {
        user: await identity.setUserStatus(bearer(request), statusMatch[1], String(body.status ?? '') as UserStatus),
      });
      return;
    }
    const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-code$/);
    if (request.method === 'POST' && resetMatch) {
      const body = await readJson(request);
      await identity.resetCode(bearer(request), resetMatch[1], body.code ? String(body.code) : undefined);
      sendJson(response, 200, { ok: true });
      return;
    }
    sendJson(response, 404, { error: 'Маршрут не найден', code: 'not_found' });
  } catch (error) {
    if (error instanceof IdentityError || error instanceof ShiftError || error instanceof ProgressionError || error instanceof EquipmentError) {
      sendJson(response, error.status, { error: error.message, code: error.code });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: 'Внутренняя ошибка сервера', code: 'internal_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.info(`Synopsis server ${version}: http://${HOST}:${PORT}`);
  console.info(`Identity store: ${STORE_PATH}`);
  console.info(`Security profile: ${SECURITY_PROFILE}`);
  console.info(`Content root: ${CONTENT_ROOT}`);
});

function shutdown(signal: string): void {
  console.info(`${signal}: остановка сервера`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
