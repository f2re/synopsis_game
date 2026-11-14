import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, lstat } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const checkout = createHash('sha256').update(root).digest('hex').slice(0, 16);
// Use a short path on macOS, where TMPDIR can exceed the socket path limit.
const directory = join(process.platform === 'darwin' ? '/tmp' : tmpdir(), `synopsis-dev-${process.getuid?.()}`);
const socketPath = join(directory, `${checkout}.sock`);

function connect() {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    socket.once('error', reject);
    socket.once('connect', () => resolve(socket));
  });
}

async function stop() {
  try {
    const socket = await connect();
    // Wait for a response from the supervisor after both process groups exit.
    await new Promise((resolve, reject) => {
      let reply = '';
      socket.once('error', reject);
      socket.on('data', (data) => { reply += data.toString(); });
      socket.once('end', () => {
        if (reply === 'stopped\n') resolve();
        else reject(new Error('Серверы не подтвердили остановку.'));
      });
      socket.setTimeout(10_000, () => socket.destroy(new Error('Серверы не подтвердили остановку вовремя.')));
      socket.write('stop\n');
      socket.resume();
    });
    console.log('Веб-клиент и API остановлены.');
  } catch (error) {
    if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
    console.log('Активный совместный запуск не найден.');
  }
}

async function listen(server) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077) !== 0) {
    throw new Error(`Небезопасный каталог запуска: ${directory}`);
  }

  const open = () => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => {
      server.off('error', reject);
      resolve();
    });
  });
  try {
    await open();
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    try {
      const running = await connect();
      running.destroy();
    } catch (probeError) {
      if (probeError.code !== 'ECONNREFUSED') throw probeError;
      throw new Error(`Остался сокет предыдущего запуска: ${socketPath}. Проверь, что процессы проекта завершены, удали этот сокет и повтори pnpm dev.`);
    }
    throw new Error('Серверы уже запущены. Для остановки выполни pnpm dev:stop.');
  }
}

function signalGroup(pid, signal) {
  if (!pid) return false;
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    // macOS can deny a group probe while its last processes are exiting.
    if (signal === 0 && error.code === 'EPERM') return true;
    throw error;
  }
}

async function run() {
  const children = [];
  const clients = new Set();
  let shutdown;
  function finish(exitCode) {
    shutdown ??= (async () => {
      const pids = children.map((child) => child.pid);
      async function waitForExit(timeout) {
        const deadline = Date.now() + timeout;
        while (pids.some((pid) => signalGroup(pid, 0))) {
          if (Date.now() >= deadline) return false;
          await delay(50);
        }
        return true;
      }
      let stopped = false;
      try {
        pids.forEach((pid) => signalGroup(pid, 'SIGTERM'));
        stopped = await waitForExit(3000);
        if (!stopped) {
          pids.forEach((pid) => signalGroup(pid, 'SIGKILL'));
          stopped = await waitForExit(3000);
        }
      } catch (error) {
        console.error(error.message);
      }
      server.close();
      for (const client of clients) client.end(stopped ? 'stopped\n' : undefined);
      if (!stopped) console.error('Не удалось подтвердить завершение процессов.');
      process.exitCode = stopped ? exitCode : 1;
    })();
    return shutdown;
  }

  const server = createServer((socket) => {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => socket.destroy());
    socket.setTimeout(5000, () => socket.destroy());
    let command = '';
    socket.on('data', (data) => {
      command += data.toString();
      if (command === 'stop\n') {
        socket.setTimeout(0);
        void finish(0);
      } else if (!'stop\n'.startsWith(command)) {
        socket.destroy();
      }
    });
  });
  await listen(server);
  process.once('SIGINT', () => void finish(0));
  process.once('SIGTERM', () => void finish(0));
  process.once('SIGHUP', () => void finish(0));

  for (const [name, args] of [
    ['API', ['-C', 'apps/server', 'dev']],
    ['Веб-клиент', ['-C', 'apps/web', 'dev', '--strictPort']],
  ]) {
    const child = spawn('pnpm', args, { cwd: root, detached: true, stdio: ['ignore', 'inherit', 'inherit'] });
    children.push(child);
    child.once('error', (error) => {
      if (!shutdown) console.error(`${name}: ${error.message}`);
      void finish(1);
    });
    child.once('exit', (code, signal) => {
      if (!shutdown) console.error(`${name} завершился (${signal ?? code}).`);
      void finish(code || 1);
    });
  }
}

try {
  if (process.platform === 'win32') throw new Error('Совместный запуск доступен на macOS, Linux и в WSL.');
  await (process.argv[2] === 'stop' ? stop() : run());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
