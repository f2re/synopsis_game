import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';

const host = process.env.API_BIND || '127.0.0.1';
const port = Number(process.env.API_PORT || '4174');
const version = process.env.SYNOPSIS_VERSION || (() => {
  try { return fs.readFileSync(process.env.SYNOPSIS_VERSION_FILE || '/opt/synopsis-game/current/VERSION', 'utf8').trim(); }
  catch { return 'dev'; }
})();
const startedAt = new Date().toISOString();

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store',
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    return json(res, 200, { status: 'ok', version, startedAt });
  }
  if (url.pathname === '/ready' || url.pathname === '/api/ready') {
    return json(res, 200, {
      status: 'ready',
      version,
      hostname: os.hostname(),
      configSchema: Number(process.env.CONFIG_SCHEMA_VERSION || '1'),
    });
  }
  if (url.pathname === '/api/runtime-config') {
    return json(res, 200, {
      version,
      publicUrl: process.env.PUBLIC_URL || '',
      websocketPath: process.env.WS_PATH || '/ws',
      mapsProvider: process.env.MAPS_PROVIDER || 'none',
      mapsBaseUrl: process.env.MAPS_BASE_URL || '',
      kn01Transport: process.env.KN01_TRANSPORT || 'file',
    });
  }
  return json(res, 404, { error: 'not_found' });
});

server.listen(port, host, () => {
  console.log(`[synopsis-game] API ${version} listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[synopsis-game] ${signal}: shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
