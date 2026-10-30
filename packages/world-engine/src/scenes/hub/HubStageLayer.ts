import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import { worldBridge } from '../../bridge/WorldBridge';
import type { StageStatus, StageStatusMap } from './hubStages';

export interface DiegeticBadgeDef {
  stageId: string;
  buildingId: string;
  title: string;
  badgeLevel: string;
  hasUpgradeArrow: boolean;
  x: number;
  y: number;
}

/**
 * Канонические диегетические плашки зданий в стиле AAA-референса кампуса 26063.
 * Заменяют процедурные номерные кружки (1)..(6) и пунктир на мостовой.
 */
export const DIEGETIC_BADGE_DEFS: readonly DiegeticBadgeDef[] = [
  {
    stageId: 'kn01',
    buildingId: 'codepost',
    title: 'КОДОВЫЙ ПОСТ',
    badgeLevel: 'Ур. 3',
    hasUpgradeArrow: true,
    x: 262,
    y: 122,
  },
  {
    stageId: 'cartography',
    buildingId: 'cartography',
    title: 'КАРТЫ И АНАЛИЗ',
    badgeLevel: 'Ур. 3',
    hasUpgradeArrow: true,
    x: 126,
    y: 86,
  },
  {
    stageId: 'radar',
    buildingId: 'radar',
    title: 'РАДАР',
    badgeLevel: 'Ур. 2',
    hasUpgradeArrow: true,
    x: 128,
    y: 28,
  },
  {
    stageId: 'archive',
    buildingId: 'archive',
    title: 'АРХИВ',
    badgeLevel: 'Ур. 2',
    hasUpgradeArrow: true,
    x: 232,
    y: 56,
  },
  {
    stageId: 'aerology',
    buildingId: 'lab',
    title: 'АЭРОЛОГИЯ',
    badgeLevel: 'Ур. 3',
    hasUpgradeArrow: true,
    x: 340,
    y: 48,
  },
  {
    stageId: 'duel',
    buildingId: 'hall',
    title: 'ТУРНИРНЫЙ ЗАЛ',
    badgeLevel: 'Ур. 2',
    hasUpgradeArrow: true,
    x: 398,
    y: 112,
  },
];

interface BadgeItem {
  def: DiegeticBadgeDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  titleText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  arrowGraphic: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Rectangle;
  baseY: number;
  width: number;
  height: number;
  hovered: boolean;
}

export class HubStageLayer {
  private readonly scene: Phaser.Scene;
  private readonly items: BadgeItem[] = [];
  private statuses: StageStatusMap = {};
  private timer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    for (const def of DIEGETIC_BADGE_DEFS) {
      const container = scene.add.container(def.x, def.y).setDepth(15);
      const bg = scene.add.graphics();

      // Заголовок плашки
      const titleText = scene.add
        .text(0, 0, def.title, {
          fontFamily: 'PixCyrillic, monospace',
          fontSize: '7px',
          color: '#e6f0fa',
        })
        .setOrigin(0, 0.5)
        .setResolution(4);

      // Уровень здания (Ур. 2 / Ур. 3)
      const levelText = scene.add
        .text(0, 0, def.badgeLevel, {
          fontFamily: 'PixCyrillic, monospace',
          fontSize: '6px',
          color: '#7fe0ff',
        })
        .setOrigin(0, 0.5)
        .setResolution(4);

      // Иконка стрелки улучшения [↑]
      const arrowGraphic = scene.add.graphics();

      // Расчёт габаритов плашки
      const titleWidth = titleText.width;
      const levelWidth = levelText.width;
      const arrowWidth = def.hasUpgradeArrow ? 8 : 0;
      const padX = 5;
      const totalWidth = padX + titleWidth + 5 + levelWidth + (def.hasUpgradeArrow ? 4 + arrowWidth : 0) + padX;
      const totalHeight = 13;

      // Позиционирование элементов внутри контейнера относительно центра
      const startX = -Math.floor(totalWidth / 2);
      titleText.setPosition(startX + padX, 0);
      levelText.setPosition(startX + padX + titleWidth + 5, 0);

      if (def.hasUpgradeArrow) {
        const ax = startX + padX + titleWidth + 5 + levelWidth + 4;
        arrowGraphic.fillStyle(0x0f2b20, 0.9);
        arrowGraphic.fillRect(ax, -5, 8, 10);
        arrowGraphic.lineStyle(1, 0x2ecc71, 0.85);
        arrowGraphic.strokeRect(ax, -5, 8, 10);

        arrowGraphic.fillStyle(0x2ecc71, 1);
        arrowGraphic.fillTriangle(ax + 4, -4, ax + 2, -1, ax + 6, -1);
        arrowGraphic.fillRect(ax + 3, -1, 2, 4);
      }

      // Интерактивная зона
      const hitZone = scene.add
        .rectangle(0, 0, totalWidth + 4, totalHeight + 4, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });

      container.add([bg, titleText, levelText, arrowGraphic, hitZone]);

      const item: BadgeItem = {
        def,
        container,
        bg,
        titleText,
        levelText,
        arrowGraphic,
        hitZone,
        baseY: def.y,
        width: totalWidth,
        height: totalHeight,
        hovered: false,
      };

      hitZone.on('pointerover', () => {
        item.hovered = true;
        this.renderBadgeBackground(item, this.statuses[def.stageId] ?? 'locked');
      });

      hitZone.on('pointerout', () => {
        item.hovered = false;
        this.renderBadgeBackground(item, this.statuses[def.stageId] ?? 'locked');
      });

      hitZone.on('pointerdown', () => {
        const status = this.statuses[def.stageId] ?? 'locked';
        if (status !== 'locked') {
          worldBridge.notifyBuildingClicked(def.buildingId);
        }
      });

      this.items.push(item);
      this.renderBadgeBackground(item, 'locked');
    }
  }

  setStatuses(statuses: StageStatusMap): void {
    this.statuses = statuses;
    for (const item of this.items) {
      const status = this.statuses[item.def.stageId] ?? 'locked';
      this.renderBadgeBackground(item, status);
    }
  }

  private renderBadgeBackground(item: BadgeItem, status: StageStatus): void {
    const { bg, width, height, titleText, levelText, hovered } = item;
    bg.clear();

    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    const isCurrent = status === 'current';
    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';

    // Цвета рамки и заливки
    let borderColor = 0x22486f;
    let borderAlpha = 0.85;
    let fillAlpha = 0.90;

    if (hovered && !isLocked) {
      borderColor = 0x5dade2;
      borderAlpha = 1.0;
      fillAlpha = 0.96;
    } else if (isCurrent) {
      borderColor = 0xf5b041;
      borderAlpha = 0.95;
    } else if (isCompleted) {
      borderColor = 0x27ae60;
      borderAlpha = 0.75;
    } else if (isLocked) {
      borderColor = 0x1b2838;
      borderAlpha = 0.6;
      fillAlpha = 0.82;
    }

    // Тёмная стеклянная панель
    bg.fillStyle(0x071324, fillAlpha);
    bg.fillRoundedRect(-halfW, -halfH, width, height, 2);

    // 1-пиксельная обводка
    bg.lineStyle(1, borderColor, borderAlpha);
    bg.strokeRoundedRect(-halfW, -halfH, width, height, 2);

    // Цвет заголовка
    if (isLocked) {
      titleText.setColor('#687d94');
      levelText.setColor('#43566b');
      item.arrowGraphic.setAlpha(0.3);
    } else if (isCurrent) {
      titleText.setColor('#fff4d4');
      levelText.setColor('#ffe082');
      item.arrowGraphic.setAlpha(1.0);
    } else if (isCompleted) {
      titleText.setColor('#d5f5e3');
      levelText.setColor('#7fe0ff');
      item.arrowGraphic.setAlpha(0.85);
    } else {
      titleText.setColor('#e8f4fc');
      levelText.setColor('#7fe0ff');
      item.arrowGraphic.setAlpha(0.85);
    }

    item.hitZone.input?.cursor && (item.hitZone.input.cursor = isLocked ? 'default' : 'pointer');
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;

    // Плавное лёгкое покачивание (плавание) плашек в стиле AAA-интерфейса
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const status = this.statuses[item.def.stageId] ?? 'locked';
      const bob = Math.sin((this.timer + i * 400) / 700) * 0.8;
      const lift = item.hovered ? -2 : 0;
      item.container.setY(item.baseY + bob + lift);

      // Акцентная пульсация для текущего активного этапа
      if (status === 'current') {
        const pulse = 0.85 + 0.15 * Math.sin(this.timer / 250);
        item.bg.setAlpha(pulse);
      } else {
        item.bg.setAlpha(1);
      }
    }
  }

  destroy(): void {
    for (const item of this.items) {
      item.container.destroy();
    }
    this.items.length = 0;
  }
}
