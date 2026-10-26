import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { IdentityError, IdentityService, type CreateUserInput } from './modules/identity/identityService.js';
import type { UserStatus } from './modules/identity/model.js';

const PORT = Number(process.env.SYNOPSIS_SERVER_PORT ?? 8787);
const STORE_PATH = process.env.SYNOPSIS_IDENTITY_STORE ?? resolve(process.cwd(), '.local/identity.json');
const SECURITY_PROFILE = process.env.SYNOPSIS_SECURITY_PROFILE === 'trusted' ? 'trusted' : 'public';

const identity = new IdentityService({
  storePath: STORE_PATH,
  securityProfile: SECURITY_PROFILE,
});
await identity.init();

const bootstrapCode = process.env.SYNOPSIS_BOOTSTRAP_ADMIN_CODE;
if (bootstrapCode) {
  const created = await identity.bootstrapAdmin(
    process.env.SYNOPSIS_BOOTSTRAP_ADMIN_NAME ?? 'Администратор',
    bootstrapCode,
  );
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

    if (request.method === 'GET' && path === '/api/health') {
      sendJson(response, 200, { ok: true, service: 'synopsis-server' });
      return;
    }

    if (request.method === 'GET' && path === '/api/identity/groups') {
      sendJson(response, 200, { groups: identity.listGroups() });
      return;
    }

    if (request.method === 'GET' && path === '/api/identity/roster') {
      const groupId = url.searchParams.get('group') ?? '';
      sendJson(response, 200, { users: identity.listRoster(groupId) });
      return;
    }

    if (request.method === 'POST' && path === '/api/identity/login') {
      const body = await readJson(request);
      const result = await identity.login(String(body.userId ?? ''), String(body.code ?? ''), clientIp(request));
      sendJson(response, 200, result);
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

    if (request.method === 'GET' && path === '/api/admin/users') {
      sendJson(response, 200, { users: identity.listUsers(bearer(request)) });
      return;
    }

    if (request.method === 'POST' && path === '/api/admin/users') {
      const body = await readJson(request);
      const input: CreateUserInput = {
        displayName: String(body.displayName ?? ''),
        groupId: String(body.groupId ?? ''),
        roles: Array.isArray(body.roles) ? body.roles as CreateUserInput['roles'] : [],
        initialCode: String(body.initialCode ?? ''),
      };
      sendJson(response, 201, { user: await identity.createUser(bearer(request), input) });
      return;
    }

    const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && statusMatch) {
      const body = await readJson(request);
      const status = String(body.status ?? '') as UserStatus;
      sendJson(response, 200, { user: await identity.setUserStatus(bearer(request), statusMatch[1], status) });
      return;
    }

    const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-code$/);
    if (request.method === 'POST' && resetMatch) {
      const body = await readJson(request);
      await identity.resetCode(bearer(request), resetMatch[1], String(body.code ?? ''));
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 404, { error: 'Маршрут не найден', code: 'not_found' });
  } catch (error) {
    if (error instanceof IdentityError) {
      sendJson(response, error.status, { error: error.message, code: error.code });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: 'Внутренняя ошибка сервера', code: 'internal_error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.info(`Synopsis server: http://127.0.0.1:${PORT}`);
  console.info(`Identity store: ${STORE_PATH}`);
  console.info(`Security profile: ${SECURITY_PROFILE}`);
});
