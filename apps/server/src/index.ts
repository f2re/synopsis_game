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

const HOST = process.env.API_BIND ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? process.env.SYNOPSIS_SERVER_PORT ?? 8787);
const STORE_PATH = process.env.SYNOPSIS_IDENTITY_STORE ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/var/lib/synopsis-game/data/identity.json' : resolve(process.cwd(), '.local/identity.json'));
const SECURITY_PROFILE = process.env.SYNOPSIS_SECURITY_PROFILE === 'trusted' ? 'trusted' : 'public';
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = process.env.SYNOPSIS_CONTENT_ROOT ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/opt/synopsis-game/current/content' : resolve(MODULE_DIR, '../../../content'));
const ATTEMPT_LOG_PATH = process.env.SYNOPSIS_ATTEMPT_LOG ??
  (process.env.SYNOPSIS_VERSION_FILE ? '/var/lib/synopsis-game/data/attempts.jsonl' : resolve(MODULE_DIR, '../.local/attempts.jsonl'));
const startedAt = new Date().toISOString();
const version = process.env.SYNOPSIS_VERSION ?? (() => {
  try {
    return fs.readFileSync(process.env.SYNOPSIS_VERSION_FILE ?? '/opt/synopsis-game/current/VERSION', 'utf8').trim();
  } catch {
    return 'dev';
  }
})();

const identity = new IdentityService({ storePath: STORE_PATH, securityProfile: SECURITY_PROFILE });
await identity.init();
const shifts = new ShiftService({ contentRoot: CONTENT_ROOT, attemptLogPath: ATTEMPT_LOG_PATH });
await shifts.init();

const bootstrapCode = process.env.SYNOPSIS_BOOTSTRAP_ADMIN_CODE;
if (bootstrapCode) {
  const created = await identity.bootstrapAdmin(process.env.SYNOPSIS_BOOTSTRAP_ADMIN_NAME ?? 'Администратор', bootstrapCode);
  if (created) console.info('Создан первоначальный администратор. Bootstrap-код больше не нужен.');
} else if (!identity.hasAdmin()) {
  console.warn('Администратор не создан. Для первого запуска задайте SYNOPSIS_BOOTSTRAP_ADMIN_CODE.');
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
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
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

    if (request.method === 'POST' && path === '/api/shifts') {
      const user = identity.me(bearer(request));
      sendJson(response, 201, shifts.startShift(user.id));
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
    if (error instanceof IdentityError || error instanceof ShiftError) {
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
