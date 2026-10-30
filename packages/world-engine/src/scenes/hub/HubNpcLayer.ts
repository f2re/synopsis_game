import Phaser from 'phaser';
import { WORLD_PALETTE } from '../../theme/tokens';
import type { DayPhase } from './HubTimeOfDay';

export class HubNpcLayer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Персонажи
  private mentorContainer!: Phaser.GameObjects.Container;
  private techContainer!: Phaser.GameObjects.Container;
  private labContainer!: Phaser.GameObjects.Container;
  private avatarContainer!: Phaser.GameObjects.Container;

  private mentorBreathTimer = 0;
  private labWalkTimer = 0;
  private labX = 84;
  private labDirection = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);

    this.createMentor();
    this.createTechnician();
    this.createLabAssistant();
    this.createPlayerAvatar();
  }

  // 1. Вера Павловна Ладожская — ведущий синоптик, наставник (x=270, y=215)
  private createMentor(): void {
    this.mentorContainer = this.scene.add.container(270, 215);

    if (this.scene.textures.exists('npc_mentor')) {
      const mentorSprite = this.scene.add.image(0, 0, 'npc_mentor').setScale(1.0).setOrigin(0.5);
      const hit = this.scene.add.rectangle(0, 0, 14, 24, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        // Приветственный кивок наставника
        this.scene.tweens.add({
          targets: mentorSprite,
          y: '-=3',
          yoyo: true,
          duration: 180,
        });
      });

      this.mentorContainer.add([mentorSprite, hit]);
    } else {
      // Ноги и юбка/брюки
      const legs = this.scene.add.rectangle(0, 10, 6, 8, WORLD_PALETTE.uiTeal1).setOrigin(0.5);
      // Пальто синоптика цвета тёмной морской волны
      const torso = this.scene.add.rectangle(0, 2, 8, 12, WORLD_PALETTE.uiTeal2).setOrigin(0.5);
      // Голова и причёска каре
      const head = this.scene.add.rectangle(0, -7, 6, 6, WORLD_PALETTE.birchAndSnow2).setOrigin(0.5);
      const hair = this.scene.add.rectangle(0, -9, 7, 4, WORLD_PALETTE.ochreTerracotta0).setOrigin(0.5);
      // Очки
      const glasses = this.scene.add.rectangle(1, -7, 5, 2, WORLD_PALETTE.actionAccent1).setOrigin(0.5);
      // Папка с синоптическими картами в руках
      const folder = this.scene.add.rectangle(4, 3, 4, 6, WORLD_PALETTE.paperTape1).setOrigin(0.5);

      const hit = this.scene.add.rectangle(0, 0, 14, 28, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerdown', () => {
        // Приветственный кивок наставника
        this.scene.tweens.add({
          targets: [head, glasses, hair],
          y: '+=2',
          yoyo: true,
          duration: 180,
        });
      });

      this.mentorContainer.add([legs, torso, folder, head, hair, glasses, hit]);
    }
    this.container.add(this.mentorContainer);
  }

  // 2. Семён — техник метеоплощадки у будки (x=260, y=156)
  private createTechnician(): void {
    this.techContainer = this.scene.add.container(260, 156);

    const legs = this.scene.add.rectangle(0, 10, 6, 8, WORLD_PALETTE.stoneConcrete1).setOrigin(0.5);
    const torso = this.scene.add.rectangle(0, 2, 8, 12, WORLD_PALETTE.ochreTerracotta1).setOrigin(0.5);
    const head = this.scene.add.rectangle(0, -7, 6, 6, WORLD_PALETTE.birchAndSnow2).setOrigin(0.5);
    const cap = this.scene.add.rectangle(0, -10, 7, 3, WORLD_PALETTE.stoneConcrete0).setOrigin(0.5);
    // Планшет для записи срочных наблюдений
    const clipboard = this.scene.add.rectangle(3, 3, 3, 5, WORLD_PALETTE.paperTape0).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 14, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: this.techContainer,
        scaleX: 1.1,
        yoyo: true,
        duration: 150,
      });
    });

    this.techContainer.add([legs, torso, clipboard, head, cap, hit]);
    this.container.add(this.techContainer);
  }

  // 3. Татьяна — лаборантка с архивными бланками (x=84..130, y=168)
  private createLabAssistant(): void {
    this.labContainer = this.scene.add.container(this.labX, 168);

    const legs = this.scene.add.rectangle(0, 8, 5, 8, WORLD_PALETTE.stoneConcrete2).setOrigin(0.5);
    const coat = this.scene.add.rectangle(0, 1, 7, 11, WORLD_PALETTE.birchAndSnow3).setOrigin(0.5);
    const head = this.scene.add.rectangle(0, -7, 5, 5, WORLD_PALETTE.birchAndSnow2).setOrigin(0.5);
    const hair = this.scene.add.rectangle(0, -9, 6, 4, WORLD_PALETTE.ochreTerracotta2).setOrigin(0.5);

    const hit = this.scene.add.rectangle(0, 0, 12, 26, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.labContainer.add([legs, coat, head, hair, hit]);
    this.container.add(this.labContainer);
  }

  // 4. Аватар игрока (M1) на центральной аллее (x=240, y=230)
  private createPlayerAvatar(): void {
    this.avatarContainer = this.scene.add.container(240, 230);

    // Ноги
    const legs = this.scene.add.rectangle(0, 11, 7, 9, WORLD_PALETTE.uiTeal0).setOrigin(0.5);
    // Фирменная штормовка станции 26063
    const jacket = this.scene.add.rectangle(0, 2, 9, 13, WORLD_PALETTE.uiTeal3).setOrigin(0.5);
    // Шеврон станции
    const badge = this.scene.add.rectangle(-2, 0, 2, 3, WORLD_PALETTE.actionAccent1).setOrigin(0.5);
    // Голова и шапочка-бини
    const head = this.scene.add.rectangle(0, -8, 6, 6, WORLD_PALETTE.birchAndSnow2).setOrigin(0.5);
    const beanie = this.scene.add.rectangle(0, -11, 7, 4, WORLD_PALETTE.actionAccent0).setOrigin(0.5);

    this.avatarContainer.add([legs, jacket, badge, head, beanie]);
    this.container.add(this.avatarContainer);
  }

  // Перемещение аватара к выбранному зданию
  walkAvatarTo(x: number, y: number, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this.avatarContainer,
      x,
      y,
      duration: 1200,
      ease: 'Power1',
      onComplete,
    });
  }

  update(deltaMs: number, _phase: DayPhase): void {
    const deltaSec = deltaMs / 1000;

    // 1. Дыхание наставника и аватара
    this.mentorBreathTimer += deltaMs;
    const breath = 1 + 0.04 * Math.sin(this.mentorBreathTimer / 800);
    this.mentorContainer.setScale(1, breath);
    this.avatarContainer.setScale(1, breath);

    // 2. Движение лаборантки между Архивом и Кодовым постом (x: 84 .. 130)
    this.labWalkTimer += deltaSec;
    this.labX += this.labDirection * deltaSec * 8;
    if (this.labX > 130) {
      this.labX = 130;
      this.labDirection = -1;
    } else if (this.labX < 84) {
      this.labX = 84;
      this.labDirection = 1;
    }
    this.labContainer.setX(this.labX);
    this.labContainer.setScale(this.labDirection, 1);
  }

  destroy(): void {
    this.container.destroy();
  }
}
