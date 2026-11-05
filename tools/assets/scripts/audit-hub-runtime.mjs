#!/usr/bin/env node
/**
 * Диагностика ссылок на Hub-ресурсы и целостности встроенной WebP-мастер-текстуры.
 * Запуск из корня: node tools/assets/scripts/audit-hub-runtime.mjs
 * Только чтение. Скрипт НЕ утверждает художественную пригодность ресурсов.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const publicRoot = join(root, 'apps/web/public');
const problems = [];
const info = [];

function reportProblem(message) {
  problems.push(message);
  console.error('FAIL ' + message);
}
function reportOk(message) {
  info.push(message);
  console.log('OK ' + message);
}

const sceneFile = join(root, 'packages/world-engine/src/scenes/hub/HubScene.ts');
if (!existsSync(sceneFile)) {
  reportProblem('Не найден исходник HubScene.ts');
} else {
  const source = readFileSync(sceneFile, 'utf8');
  const declared = [...source.matchAll(/this\.load\.image\(\s*['"][^'"]+['"]\s*,\s*['"](\/hub\/[^'"]+)['"]/g)];
  if (declared.length === 0) reportProblem('Не обнаружены загрузки hub-изображений: проверить парсер/сцену');
  for (const match of declared) {
    const urlPath = match[1];
    const target = join(publicRoot, urlPath.slice(1));
    if (!existsSync(target)) {
      reportProblem('Отсутствует runtime текстура ' + urlPath);
      continue;
    }
    const bytes = readFileSync(target);
    if (urlPath.endsWith('.png')) {
      const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(png) || bytes.toString('ascii', 12, 16) !== 'IHDR') {
        reportProblem('Повреждён PNG/IHDR: ' + urlPath);
        continue;
      }
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (width === 0 || height === 0) reportProblem('Нулевая геометрия PNG: ' + urlPath);
      else reportOk(urlPath + ' (' + width + 'x' + height + ')');
    } else reportOk(urlPath + ' (' + bytes.length + ' байт)');
  }
}

const embeddedFolder = join(root, 'packages/world-engine/src/assets/hub');
const chunks = existsSync(embeddedFolder)
  ? readdirSync(embeddedFolder).filter((name) => /^runtimePart\d+\.ts$/.test(name)).sort()
  : [];

if (chunks.length === 0) {
  reportProblem('Не найдены встроенные runtimePartNN.ts');
} else {
  const parts = [];
  for (const name of chunks) {
    const raw = readFileSync(join(embeddedFolder, name), 'utf8');
    const match = raw.match(/export\s+default\s+['"]([A-Za-z0-9+/=]+)['"]\s*;/);
    if (!match) reportProblem('Неподдерживаемый формат Base64 в ' + name);
    else {
      parts.push(match[1]);
      if (match[1].length % 4 !== 0) reportOk(name + ': фрагмент не кратен 4 (допустимо до конкатенации)');
    }
  }
  if (parts.length === chunks.length) {
    const encoded = parts.join('');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      reportProblem('Встроенный WebP Base64 повреждён: длина ' + encoded.length + ' (mod 4 = ' + encoded.length % 4 + ')');
    } else {
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
        reportProblem('Встроенная текстура не является корректным RIFF/WEBP');
      } else if (bytes.readUInt32LE(4) + 8 !== bytes.length) {
        reportProblem('Несовпадение длины RIFF/WebP: header=' + (bytes.readUInt32LE(4) + 8) + ', decoded=' + bytes.length);
      } else {
        reportOk('Встроенный RIFF/WEBP: ' + bytes.length + ' байт; декодируемость и визуал требуют отдельной проверки');
      }
    }
  }
}
console.log('Hub runtime asset audit: ' + problems.length + ' ошибок; ' + info.length + ' наблюдений.');
if (problems.length) process.exitCode = 1;
