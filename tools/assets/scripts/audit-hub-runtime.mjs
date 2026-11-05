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

const {createHash}=await import('node:crypto');
const requireProduction=process.argv.includes('--require-production');
function reportRetiredLegacyProblem(message){
  console.warn('LEGACY_BLOCKER '+message+' (старый встраиваемый WebP; не входит в принятые слои)');
  if(requireProduction)reportProblem(message);
}
const manifestPath=join(root,'packages/world-engine/src/assets/hub/runtime-approval.json');
if(!existsSync(manifestPath)) {
  reportProblem('Не найден approved-asset манифест');
} else {
  const catalog=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(catalog.schemaVersion!==1||!Array.isArray(catalog.assets)) reportProblem('Неверная схема манифеста');
  else {
    const keys=new Set(),urls=new Set();
    for(const asset of catalog.assets){
      if(!asset.key||keys.has(asset.key)||urls.has(asset.url)||!/^\/hub\/layers\/[a-z0-9_-]+\.png$/.test(asset.url??'')){
        reportProblem('Неуникальный или небезопасный asset: '+JSON.stringify(asset));continue;
      }
      keys.add(asset.key);urls.add(asset.url);
      if(asset.status==='pending'){
        console.log('PENDING '+asset.url+' (Phaser не загружает)');
        if(requireProduction)reportProblem('Не принят production-ресурс '+asset.url);
        continue;
      }
      if(asset.status!=='approved'||catalog.artAcceptance!=='PASS'){
        reportProblem('Недопустимый статус допуска: '+asset.url);continue;
      }
      if(!/^[a-f0-9]{64}$/.test(asset.sha256??'')||!/^https:\/\/github.com\/f2re\/synopsis_game\/(issues|pull)\/\d+/.test(asset.artReviewUrl??'')){
        reportProblem('Нет SHA-256 или независимого review: '+asset.url);continue;
      }
      const target=join(publicRoot,asset.url.slice(1));
      if(!existsSync(target)){reportProblem('Отсутствует утверждённый PNG: '+asset.url);continue;}
      const bytes=readFileSync(target),signature=Buffer.from([137,80,78,71,13,10,26,10]);
      if(bytes.length<24||!bytes.subarray(0,8).equals(signature)||bytes.toString('ascii',12,16)!=='IHDR'){
        reportProblem('Не PNG/IHDR: '+asset.url);continue;
      }
      const sha=createHash('sha256').update(bytes).digest('hex');
      if(sha!==asset.sha256)reportProblem('SHA-256 mismatch: '+asset.url);
      else reportOk('Принятый PNG '+asset.url+' '+bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20));
    }
    if(catalog.artAcceptance==='PASS'&&catalog.assets.some(a=>a.status!=='approved'))reportProblem('ART PASS при незавершённых слоях');
    if(catalog.artAcceptance!=='PASS')console.log('STATUS: art pending; legacy procedural fallback only, not ART_ACCEPTED');
    if(requireProduction&&catalog.artAcceptance!=='PASS')reportProblem('Не допускать production Hub');
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
      reportRetiredLegacyProblem('Встроенный WebP Base64 повреждён: длина ' + encoded.length + ' (mod 4 = ' + encoded.length % 4 + ')');
    } else {
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
        reportRetiredLegacyProblem('Встроенная текстура не является корректным RIFF/WEBP');
      } else if (bytes.readUInt32LE(4) + 8 !== bytes.length) {
        reportRetiredLegacyProblem('Несовпадение длины RIFF/WebP: header=' + (bytes.readUInt32LE(4) + 8) + ', decoded=' + bytes.length);
      } else {
        reportOk('Встроенный RIFF/WEBP: ' + bytes.length + ' байт; декодируемость и визуал требуют отдельной проверки');
      }
    }
  }
}
console.log('Hub runtime asset audit: ' + problems.length + ' ошибок; ' + info.length + ' наблюдений.');
if (problems.length) process.exitCode = 1;
