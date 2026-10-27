#!/usr/bin/env node
/**
 * build-level1.mjs
 * 
 * Конвейер детерминированной сборки ассетов уровня КН-01:
 * - Читает манифесты из assets/manifests/
 * - Формирует семантический индекс метаданных в assets/generated/metadata/level1-assets.json
 * - Генерирует детерминированный атлас level1-atlas.json
 * - Исключает устаревшие файлы (hub_master_night) из рабочего контура
 * - Обеспечивает строгую воспроизводимость (одинаковые SHA-256 хэши)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../../');

const MANIFESTS_DIR = join(ROOT, 'assets/manifests');
const GENERATED_DIR = join(ROOT, 'assets/generated');
const METADATA_DIR = join(GENERATED_DIR, 'metadata');
const ATLASES_DIR = join(GENERATED_DIR, 'atlases');

[METADATA_DIR, ATLASES_DIR].forEach((dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Список канонических манифестов Уровня 1
const LEVEL1_MANIFEST_FILES = [
  'hub.layers.v3.json',
  'hub.building-states.v3.json',
  'room.codepost.json',
  'fauna.level1.json',
  'npc.level1.json',
  'avatar.level1.json',
  'ui.kit.v3.json',
  'brand.mark.v3.json',
  'rewards.level1.json',
  'effects.level1.json',
  'audio.collection.json'
].sort();

// Запрещённые устаревшие файлы
const FORBIDDEN_RUNTIME_PATTERNS = [
  'hub_master_night',
  'alpine_peaks',
  'mountain_ridge'
];

console.log('=== Сборка ассетов уровня КН-01 (Конвейер v3) ===');

const compiledMetadata = {
  version: '3.0.0',
  buildTimestamp: 'deterministic-static',
  target: 'kn01_level1',
  manifests: {},
  semanticAssetMap: {},
  excludedLegacy: FORBIDDEN_RUNTIME_PATTERNS
};

const atlasEntries = {};

for (const manifestFile of LEVEL1_MANIFEST_FILES) {
  const filePath = join(MANIFESTS_DIR, manifestFile);
  if (!existsSync(filePath)) {
    console.error(`Ошибка: Манифест не найден: ${manifestFile}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  
  // Проверка на запрещённые файлы
  for (const forbidden of FORBIDDEN_RUNTIME_PATTERNS) {
    if (content.includes(forbidden)) {
      console.error(`Нарушение: Манифест ${manifestFile} содержит запрещённую ссылку на ${forbidden}`);
      process.exit(1);
    }
  }

  const manifest = JSON.parse(content);
  compiledMetadata.manifests[manifest.id] = {
    file: manifestFile,
    version: manifest.version || '3.0.0',
    title: manifest.title || manifest.id,
    kind: manifest.kind || 'generic'
  };

  // Регистрация семантических ассетов
  if (manifest.id === 'hub.layers.v3') {
    manifest.layers.forEach((layer) => {
      const semId = `hub.layer.${layer.layer.toLowerCase()}`;
      const dims = layer.dimensions || { width: 480, height: 270 };
      compiledMetadata.semanticAssetMap[semId] = {
        layer: layer.layer,
        name: layer.name,
        parallax: layer.parallaxFactor,
        source: layer.source,
        dimensions: dims
      };
      atlasEntries[semId] = {
        frame: { x: 0, y: 0, w: dims.width, h: dims.height },
        sourceSize: dims
      };
    });
  } else if (manifest.id === 'fauna.level1') {
    manifest.entities.forEach((entity) => {
      compiledMetadata.semanticAssetMap[`fauna.${entity.id}`] = {
        name: entity.name,
        scales: entity.scales,
        states: Object.keys(entity.states)
      };
      atlasEntries[`fauna.${entity.id}`] = {
        frame: { x: 0, y: 0, w: 32, h: 32 },
        sourceSize: { width: 32, height: 32 }
      };
    });
  } else if (manifest.id === 'npc.level1') {
    manifest.characters.forEach((char) => {
      compiledMetadata.semanticAssetMap[`npc.${char.id}`] = {
        name: char.fullName,
        role: char.role
      };
      atlasEntries[`npc.${char.id}`] = {
        frame: { x: 0, y: 0, w: 64, h: 64 },
        sourceSize: { width: 64, height: 64 }
      };
    });
  } else if (manifest.id === 'rewards.level1') {
    manifest.rewards.forEach((rew) => {
      compiledMetadata.semanticAssetMap[`reward.${rew.id}`] = {
        name: rew.name,
        condition: rew.unlockCondition
      };
      atlasEntries[`reward.${rew.id}`] = {
        frame: { x: 0, y: 0, w: 32, h: 32 },
        sourceSize: { width: 32, height: 32 }
      };
    });
  } else {
    compiledMetadata.semanticAssetMap[manifest.id] = {
      kind: manifest.kind,
      logicalSize: manifest.logicalSize
    };
    atlasEntries[manifest.id] = {
      frame: { x: 0, y: 0, w: manifest.logicalSize?.width || 256, h: manifest.logicalSize?.height || 256 },
      sourceSize: manifest.logicalSize || { width: 256, height: 256 }
    };
  }
}

// Детерминированная сортировка ключей в атласе
const sortedAtlasFrames = {};
Object.keys(atlasEntries).sort().forEach((key) => {
  sortedAtlasFrames[key] = atlasEntries[key];
});

const generatedAtlas = {
  meta: {
    app: '26063-pixel-pipeline',
    version: '3.0.0',
    image: 'level1-atlas.png',
    format: 'RGBA8888',
    size: { w: 1024, h: 1024 },
    scale: '1'
  },
  frames: sortedAtlasFrames
};

// Запись выходных файлов
const metadataOutPath = join(METADATA_DIR, 'level1-assets.json');
const atlasOutPath = join(ATLASES_DIR, 'level1-atlas.json');

const metadataJson = JSON.stringify(compiledMetadata, Object.keys(compiledMetadata).sort(), 2) + '\n';
const atlasJson = JSON.stringify(generatedAtlas, null, 2) + '\n';

writeFileSync(metadataOutPath, metadataJson, 'utf-8');
writeFileSync(atlasOutPath, atlasJson, 'utf-8');

// Вычисление контрольных сумм SHA-256
const metadataHash = createHash('sha256').update(metadataJson).digest('hex');
const atlasHash = createHash('sha256').update(atlasJson).digest('hex');

console.log(`[OK] Создан метадата-индекс: ${metadataOutPath}`);
console.log(`     SHA-256: ${metadataHash}`);
console.log(`[OK] Создан атлас уровня 1: ${atlasOutPath}`);
console.log(`     SHA-256: ${atlasHash}`);
console.log(`[OK] Всего семантических ассетов: ${Object.keys(compiledMetadata.semanticAssetMap).length}`);
console.log(`[OK] Все исключённые устаревшие файлы (${FORBIDDEN_RUNTIME_PATTERNS.join(', ')}) изолированы.`);
