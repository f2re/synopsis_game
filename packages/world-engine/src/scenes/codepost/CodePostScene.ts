import Phaser from 'phaser';
import { WORLD_PALETTE, UI_COLORS } from '../../theme/tokens';
import {
  bindLogicalViewport,
  WORLD_LOGICAL_WIDTH,
  WORLD_LOGICAL_HEIGHT,
} from '../../runtime/fitLogicalViewport';
import { worldBridge } from '../../bridge/WorldBridge';

export class CodePostScene extends Phaser.Scene {
  private teletypeCarriage!: Phaser.GameObjects.Rectangle;
  private paperTape!: Phaser.GameObjects.Rectangle;
  private catSprite!: Phaser.GameObjects.Container;
  private barographDrum!: Phaser.GameObjects.Rectangle;
  private clockSecondHand!: Phaser.GameObjects.Line;
  private windowView!: Phaser.GameObjects.Graphics;
  private stampGraphic!: Phaser.GameObjects.Graphics;

  private isStudyCalm = false;
  private catBreathingTimer = 0;
  private clockTimer = 0;
  private barographTimer = 0;
  private clockSecondAngle = 0;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super('codepost');
  }

  create(): void {
    bindLogicalViewport(this, WORLD_LOGICAL_WIDTH, WORLD_LOGICAL_HEIGHT);

    // Фоновая отделка стен и пола
    this.renderRoomShell();

    // Окно слева (L0-L2)
    this.windowView = this.add.graphics();
    this.renderWindow(WORLD_PALETTE.skyDay0, WORLD_PALETTE.skyDay2);

    // Настенные приборы: Двухциферблатные часы и Барограф М-22
    this.renderWallInstruments();

    // Шкаф со справочниками и архивными коробками «26063» справа
    this.renderCabinet();

    // Рабочий стол с телетайпом
    this.renderWorkDesk();

    // Кот Барограф на крышке телетайпа
    this.createCatBarograph();

    // Графика динамического штампа
    this.stampGraphic = this.add.graphics();

    // Настройка моста событий
    this.setupBridgeListeners();

    // Обработка потери контекста WebGL и паузы вкладки
    this.setupContextAndVisibilityHandling();

    worldBridge.notifySceneReady('codepost');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });
  }

  private renderRoomShell(): void {
    const bg = this.add.graphics();
    // Верхняя часть стены: глубокий серо-синий оттенок
    bg.fillStyle(WORLD_PALETTE.stoneConcrete0, 1);
    bg.fillRect(0, 0, WORLD_LOGICAL_WIDTH, 180);

    // Дощатый пол
    bg.fillStyle(WORLD_PALETTE.ochreTerracotta0, 1);
    bg.fillRect(0, 180, WORLD_LOGICAL_WIDTH, 90);

    // Швы половиц
    bg.lineStyle(1, WORLD_PALETTE.stoneConcrete0, 0.4);
    for (let y = 195; y < WORLD_LOGICAL_HEIGHT; y += 15) {
      bg.lineBetween(0, y, WORLD_LOGICAL_WIDTH, y);
    }
  }

  private renderWindow(skyTop: number, skyHorizon: number): void {
    this.windowView.clear();
    // Проём окна 88x112
    const wx = 16;
    const wy = 32;
    const ww = 88;
    const wh = 112;

    this.windowView.fillGradientStyle(skyTop, skyTop, skyHorizon, skyHorizon, 1);
    this.windowView.fillRect(wx, wy, ww, wh);

    // Силуэт сосновой кромки за окном
    this.windowView.fillStyle(WORLD_PALETTE.foliagePine1, 1);
    this.windowView.fillRect(wx, wy + 75, ww, 37);

    // Рама окна
    this.windowView.lineStyle(2, WORLD_PALETTE.ochreTerracotta2, 1);
    this.windowView.strokeRect(wx, wy, ww, wh);
    this.windowView.lineBetween(wx + ww / 2, wy, wx + ww / 2, wy + wh);
    this.windowView.lineBetween(wx, wy + wh / 2, wx + ww, wy + wh / 2);
  }

  private renderWallInstruments(): void {
    const g = this.add.graphics();
    // Часы с двумя циферблатами (UTC и местное время)
    const cx = 230;
    const cy = 24;
    g.fillStyle(WORLD_PALETTE.stoneConcrete1, 1);
    g.fillRect(cx, cy, 56, 32);
    g.lineStyle(1, WORLD_PALETTE.actionAccent1, 1);
    g.strokeRect(cx, cy, 56, 32);

    // Циферблат UTC (слева)
    g.fillStyle(WORLD_PALETTE.paperTape2, 1);
    g.fillCircle(cx + 14, cy + 16, 10);
    // Циферблат Местное (справа)
    g.fillCircle(cx + 42, cy + 16, 10);

    // Секундная стрелка
    this.clockSecondHand = this.add.line(
      cx + 14,
      cy + 16,
      0,
      0,
      0,
      -8,
      WORLD_PALETTE.checkingPencil0,
    );
    this.clockSecondHand.setLineWidth(1);

    // Барограф М-22
    const bx = 300;
    const by = 68;
    g.fillStyle(WORLD_PALETTE.stoneConcrete0, 1);
    g.fillRect(bx, by, 44, 32);
    g.lineStyle(1, WORLD_PALETTE.actionAccent0, 1);
    g.strokeRect(bx, by, 44, 32);

    // Вращающийся латунный барабан барографа
    this.barographDrum = this.add
      .rectangle(bx + 12, by + 16, 16, 22, WORLD_PALETTE.actionAccent1)
      .setOrigin(0.5, 0.5);

    // Стрелка-перо барографа
    g.lineStyle(1, WORLD_PALETTE.inkTelecode0, 1);
    g.lineBetween(bx + 12, by + 16, bx + 36, by + 14);
  }

  private renderCabinet(): void {
    const g = this.add.graphics();
    const sx = 360;
    const sy = 30;
    const sw = 104;
    const sh = 210;

    // Дубовый шкаф
    g.fillStyle(WORLD_PALETTE.ochreTerracotta0, 1);
    g.fillRect(sx, sy, sw, sh);
    g.lineStyle(2, WORLD_PALETTE.stoneConcrete0, 1);
    g.strokeRect(sx, sy, sw, sh);

    // Полки
    g.lineBetween(sx, sy + 50, sx + sw, sy + 50);
    g.lineBetween(sx, sy + 100, sx + sw, sy + 100);
    g.lineBetween(sx, sy + 150, sx + sw, sy + 150);

    // Справочники синоптика
    const bookColors = [
      WORLD_PALETTE.uiTeal1,
      WORLD_PALETTE.checkingPencil0,
      WORLD_PALETTE.foliagePine2,
      WORLD_PALETTE.actionAccent0,
    ];
    bookColors.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(sx + 10 + i * 20, sy + 16, 16, 34);
    });

    // Архивные коробки «26063»
    g.fillStyle(WORLD_PALETTE.paperTape1, 1);
    g.fillRect(sx + 12, sy + 108, 38, 36);
    g.fillRect(sx + 54, sy + 108, 38, 36);
  }

  private renderWorkDesk(): void {
    const g = this.add.graphics();
    const dx = 120;
    const dy = 128;
    const dw = 220;
    const dh = 110;

    // Столешница
    g.fillStyle(WORLD_PALETTE.ochreTerracotta1, 1);
    g.fillRect(dx, dy, dw, dh);
    g.lineStyle(2, WORLD_PALETTE.stoneConcrete0, 1);
    g.strokeRect(dx, dy, dw, dh);

    // Аппарат телетайпа
    const tx = 136;
    const ty = 136;
    g.fillStyle(WORLD_PALETTE.stoneConcrete1, 1);
    g.fillRect(tx, ty, 64, 48);
    g.lineStyle(1, WORLD_PALETTE.stoneConcrete2, 1);
    g.strokeRect(tx, ty, 64, 48);

    // Каретка телетайпа
    this.teletypeCarriage = this.add.rectangle(
      tx + 18,
      ty + 10,
      14,
      8,
      WORLD_PALETTE.stoneConcrete3,
    );

    // Выдвижная бумажная перфолента
    this.paperTape = this.add.rectangle(
      tx + 48,
      ty + 14,
      28,
      6,
      WORLD_PALETTE.paperTape2,
    );

    // Клавиши телетайпа
    g.fillStyle(WORLD_PALETTE.inkTelecode0, 1);
    g.fillRect(tx + 8, ty + 24, 48, 18);

    // Лампа дежурного с зеленым плафоном
    g.fillStyle(WORLD_PALETTE.actionAccent1, 1);
    g.fillRect(124, 134, 6, 14); // ножка
    g.fillStyle(WORLD_PALETTE.foliagePine2, 1);
    g.fillRect(120, 126, 14, 8); // зеленый абажур
  }

  private createCatBarograph(): void {
    this.catSprite = this.add.container(154, 126);

    // Рыжий кот Барограф спит на крышке телетайпа
    const body = this.add.ellipse(12, 6, 22, 12, WORLD_PALETTE.ochreTerracotta2);
    const head = this.add.ellipse(20, 2, 8, 8, WORLD_PALETTE.ochreTerracotta2);
    const ear1 = this.add.triangle(18, -2, 0, 4, 3, 0, 6, 4, WORLD_PALETTE.ochreTerracotta1);
    const ear2 = this.add.triangle(23, -2, 0, 4, 3, 0, 6, 4, WORLD_PALETTE.ochreTerracotta1);

    this.catSprite.add([body, head, ear1, ear2]);
    this.catSprite.setSize(26, 14).setInteractive({ useHandCursor: true });

    this.catSprite.on('pointerdown', () => {
      worldBridge.emit('codepost:cat_click', {});
      this.animateCatPurr();
    });
  }

  private setupBridgeListeners(): void {
    const unsubPrint = worldBridge.on('codepost:print', () => {
      this.animateTeletypePrint();
    });

    const unsubStamp = worldBridge.on('codepost:stamp', (payload: any) => {
      this.animateStamp(payload?.stamp || 'ПРИНЯТО');
    });

    const unsubStreak = worldBridge.on('codepost:streak', (payload: any) => {
      if (payload?.streak % 5 === 0 && payload?.streak > 0) {
        this.animateCatStretch();
      }
    });

    const unsubError = worldBridge.on('codepost:error', () => {
      this.animateErrorFeedback();
    });

    const unsubCalm = worldBridge.on('codepost:study_calm', (payload: any) => {
      this.isStudyCalm = payload?.calm ?? false;
    });

    this.unsubscribers.push(unsubPrint, unsubStamp, unsubStreak, unsubError, unsubCalm);
  }

  private animateTeletypePrint(): void {
    // 4 кадра смещения каретки
    this.tweens.add({
      targets: this.teletypeCarriage,
      x: this.teletypeCarriage.x + 8,
      duration: 80,
      yoyo: true,
      repeat: 3,
    });
  }

  private animateStamp(text: string): void {
    this.stampGraphic.clear();
    const sx = 230;
    const sy = 160;

    // Анимация удара штампа (A-05)
    this.stampGraphic.lineStyle(2, WORLD_PALETTE.stampApproved0, 1);
    this.stampGraphic.strokeRect(sx, sy, 70, 24);
    const stampText = this.add.text(sx + 6, sy + 4, text, {
      fontFamily: 'PixCyrillic, monospace',
      fontSize: '10px',
      color: '#2F6E5A',
    });

    this.tweens.add({
      targets: [stampText, this.stampGraphic],
      alpha: { from: 0, to: 1 },
      duration: 180,
    });
  }

  private animateCatPurr(): void {
    this.tweens.add({
      targets: this.catSprite,
      scaleY: 1.15,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  private animateCatStretch(): void {
    this.tweens.add({
      targets: this.catSprite,
      x: 154,
      y: 122,
      duration: 400,
      yoyo: true,
    });
  }

  private animateErrorFeedback(): void {
    // Вздрагивание рабочей зоны (A-07)
    this.cameras.main.shake(120, 0.003);
  }

  private setupContextAndVisibilityHandling(): void {
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      this.game.loop.sleep();
    };

    const handleContextRestored = () => {
      this.game.loop.wake();
    };

    this.game.canvas.addEventListener('webglcontextlost', handleContextLost, false);
    this.game.canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.canvas.removeEventListener('webglcontextlost', handleContextLost);
      this.game.canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    });
  }

  override update(_time: number, delta: number): void {
    // Если активен профиль study-calm, фоновые микро-анимации приостанавливаются
    if (this.isStudyCalm) return;

    // 1. Дыхание кота (размеренный цикл 2/с)
    this.catBreathingTimer += delta;
    const catBreath = 1 + 0.05 * Math.sin(this.catBreathingTimer / 500);
    this.catSprite.setScale(1, catBreath);

    // 2. Секундная стрелка часов (1 шаг в секунду, 8 дискретных положений)
    this.clockTimer += delta;
    if (this.clockTimer >= 1000) {
      this.clockTimer = 0;
      this.clockSecondAngle = (this.clockSecondAngle + 45) % 360;
      const rad = Phaser.Math.DegToRad(this.clockSecondAngle);
      this.clockSecondHand.setTo(0, 0, Math.sin(rad) * 8, -Math.cos(rad) * 8);
    }

    // 3. Барабан барографа (сдвиг раз в 30 секунд)
    this.barographTimer += delta;
    if (this.barographTimer >= 30000) {
      this.barographTimer = 0;
      this.barographDrum.setX(this.barographDrum.x === 312 ? 313 : 312);
    }
  }

  private cleanup(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}
