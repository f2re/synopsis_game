import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import type { HubScheduleManager } from '../../world/hubSchedule';
import type { DayPhase } from './HubTimeOfDay';

export class HubFaunaLayer {
  private scene: Phaser.Scene;
  private scheduleManager: HubScheduleManager;
  private container: Phaser.GameObjects.Container;

  // Фауна
  private titContainer!: Phaser.GameObjects.Container;
  private sparrowsContainer!: Phaser.GameObjects.Container;
  private gullContainer!: Phaser.GameObjects.Container;
  private duckContainer!: Phaser.GameObjects.Container;
  private squirrelContainer!: Phaser.GameObjects.Container;
  private catContainer!: Phaser.GameObjects.Container;

  private gullX = 80;
  private gullSpeed = 22; // px / sec
  private catBreathingTimer = 0;
  private titHopTimer = 0;

  constructor(scene: Phaser.Scene, scheduleManager: HubScheduleManager) {
    this.scene = scene;
    this.scheduleManager = scheduleManager;
    this.container = this.scene.add.container(0, 0);

    this.createCatBarograph();
    this.createTitBird();
    this.createSparrows();
    this.createSeagull();
    this.createMallardDuck();
    this.createSquirrel();
  }

  // 1. Кот Барограф у крыльца Кодового поста (x=206, y=164)
  private createCatBarograph(): void {
    this.catContainer = this.scene.add.container(206, 164);

    const body = this.scene.add.rectangle(0, 0, 10, 6, WORLD_PALETTE.stoneConcrete2).setOrigin(0.5);
    const head = this.scene.add.rectangle(5, -2, 5, 5, WORLD_PALETTE.stoneConcrete1).setOrigin(0.5);
    const ears = this.scene.add.triangle(6, -6, 0, 3, 2, 0, 4, 3, WORLD_PALETTE.ochreTerracotta1);
    const tail = this.scene.add.rectangle(-6, -1, 4, 2, WORLD_PALETTE.stoneConcrete3).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 16, 12, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('animal_cat_barograph');
      // Анимация потягивания кота
      this.scene.tweens.add({
        targets: [body, head],
        scaleY: 1.3,
        y: '-=2',
        yoyo: true,
        duration: 300,
      });
    });

    this.catContainer.add([tail, body, head, ears, hit]);
    this.container.add(this.catContainer);
  }

  // 2. Большая синица у метеоплощадки (x=246, y=154)
  private createTitBird(): void {
    this.titContainer = this.scene.add.container(246, 154);

    const body = this.scene.add.rectangle(0, 0, 6, 4, WORLD_PALETTE.actionAccent1).setOrigin(0.5);
    const head = this.scene.add.rectangle(3, -2, 3, 3, WORLD_PALETTE.inkTelecode0).setOrigin(0.5);
    const wing = this.scene.add.rectangle(-1, 0, 3, 3, WORLD_PALETTE.uiTeal3).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 12, 10, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('bird_tit');
      // Синица вспархивает и садится обратно
      this.scene.tweens.add({
        targets: this.titContainer,
        y: '-=12',
        x: '+=8',
        yoyo: true,
        duration: 250,
      });
    });

    this.titContainer.add([body, wing, head, hit]);
    this.container.add(this.titContainer);
  }

  // 3. Стайка воробьёв на гранитной дорожке (x=136, y=168)
  private createSparrows(): void {
    this.sparrowsContainer = this.scene.add.container(136, 168);

    const sparrowPositions = [
      { x: 0, y: 0 },
      { x: 8, y: 2 },
      { x: -7, y: 3 },
    ];

    sparrowPositions.forEach((pos) => {
      const bird = this.scene.add.rectangle(pos.x, pos.y, 4, 3, WORLD_PALETTE.ochreTerracotta1).setOrigin(0.5);
      const head = this.scene.add.rectangle(pos.x + 2, pos.y - 1, 2, 2, WORLD_PALETTE.inkTelecode1).setOrigin(0.5);
      this.sparrowsContainer.add([bird, head]);
    });

    const hit = this.scene.add.rectangle(0, 0, 24, 12, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('birds_sparrows');
      // Воробьи разлетаются врассыпную
      this.scene.tweens.add({
        targets: this.sparrowsContainer,
        y: '-=16',
        alpha: 0.2,
        yoyo: true,
        duration: 400,
      });
    });

    this.sparrowsContainer.add(hit);
    this.container.add(this.sparrowsContainer);
  }

  // 4. Серебристая чайка над заливом (y=112)
  private createSeagull(): void {
    this.gullContainer = this.scene.add.container(this.gullX, 112);

    const body = this.scene.add.rectangle(0, 0, 7, 3, WORLD_PALETTE.birchAndSnow3).setOrigin(0.5);
    const leftWing = this.scene.add.line(0, 0, -4, -3, 0, 0, WORLD_PALETTE.stoneConcrete2).setOrigin(0.5);
    const rightWing = this.scene.add.line(0, 0, 0, 0, 4, -3, WORLD_PALETTE.stoneConcrete2).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 16, 12, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('bird_gull');
      // Взмах крыльями и набор высоты
      this.scene.tweens.add({
        targets: this.gullContainer,
        y: '-=10',
        yoyo: true,
        duration: 350,
      });
    });

    this.gullContainer.add([body, leftWing, rightWing, hit]);
    this.container.add(this.gullContainer);
  }

  // 5. Кряква у причала Финского залива (x=330, y=124)
  private createMallardDuck(): void {
    this.duckContainer = this.scene.add.container(330, 124);

    const body = this.scene.add.rectangle(0, 0, 8, 4, WORLD_PALETTE.foliagePine2).setOrigin(0.5);
    const head = this.scene.add.rectangle(4, -2, 3, 3, WORLD_PALETTE.foliagePine4).setOrigin(0.5);
    const beak = this.scene.add.rectangle(6, -1, 2, 1, WORLD_PALETTE.actionAccent1).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 14, 10, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('bird_mallard');
      // Ныряние утки
      this.scene.tweens.add({
        targets: this.duckContainer,
        y: '+=4',
        alpha: 0.4,
        yoyo: true,
        duration: 300,
      });
    });

    this.duckContainer.add([body, head, beak, hit]);
    this.container.add(this.duckContainer);
  }

  // 6. Обыкновенная белка на сосне у Архива (x=50, y=144)
  private createSquirrel(): void {
    this.squirrelContainer = this.scene.add.container(50, 144);

    const body = this.scene.add.rectangle(0, 0, 6, 8, WORLD_PALETTE.ochreTerracotta2).setOrigin(0.5);
    const tail = this.scene.add.rectangle(-4, -2, 3, 7, WORLD_PALETTE.ochreTerracotta1).setOrigin(0.5);
    const head = this.scene.add.rectangle(2, -4, 4, 4, WORLD_PALETTE.ochreTerracotta2).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 14, 16, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scheduleManager.interactWithFauna('animal_squirrel');
      // Белка взбегает вверх по стволу
      this.scene.tweens.add({
        targets: this.squirrelContainer,
        y: '-=18',
        yoyo: true,
        duration: 400,
      });
    });

    this.squirrelContainer.add([tail, body, head, hit]);
    this.container.add(this.squirrelContainer);
  }

  update(deltaMs: number, _phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Плавный полёт чайки над заливом L2-L3
    this.gullX += this.gullSpeed * deltaSec;
    if (this.gullX > 490) {
      this.gullX = -20;
    }
    this.gullContainer.setX(this.gullX);
    this.gullContainer.setY(112 + Math.sin(this.gullX / 30) * 3);

    // 2. Дыхание кота Барографа
    this.catBreathingTimer += deltaMs;
    const catBreath = 1 + 0.08 * Math.sin(this.catBreathingTimer / 600);
    this.catContainer.setScale(1, catBreath);

    // 3. Прыжки синицы раз в несколько секунд
    this.titHopTimer += deltaMs;
    if (this.titHopTimer > 4000) {
      this.titHopTimer = 0;
      this.scene.tweens.add({
        targets: this.titContainer,
        y: '-=3',
        yoyo: true,
        duration: 120,
      });
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
