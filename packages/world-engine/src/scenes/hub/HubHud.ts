import Phaser from 'phaser';
import { HUB_THEME } from './hubTheme';

export interface HubHudCallbacks {
  onToggleDayNight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

interface DockButtonDefinition {
  label: string;
  glyph: string;
  action: () => void;
}

export class HubHud {
  private readonly scene: any;
  private readonly callbacks: HubHudCallbacks;
  private root: any;
  private stationChip: any;
  private dock: any;
  private timeText: any;

  constructor(scene: any, callbacks: HubHudCallbacks, isNight: boolean) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.root = scene.add.container(0, 0).setDepth(HUB_THEME.depth.hud).setScrollFactor(0);
    this.stationChip = this.createStationChip();
    this.dock = this.createDock(isNight);
    this.root.add([this.stationChip, this.dock]);
  }

  private createStationChip(): any {
    const root = this.scene.add.container(0, 0);
    const bg = this.scene.add
      .rectangle(0, 0, 154, 30, HUB_THEME.color.panel, 0.88)
      .setStrokeStyle(1, HUB_THEME.color.panelBorder, 0.7);
    const pip = this.scene.add.circle(-64, 0, 3, HUB_THEME.color.success, 1);
    const title = this.scene.add
      .text(-54, 0, '26063 · Синоптик', {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '10px',
        color: HUB_THEME.css.textPrimary,
      })
      .setOrigin(0, 0.5);
    root.add([bg, pip, title]);
    return root;
  }

  private createDock(isNight: boolean): any {
    const root = this.scene.add.container(0, 0);
    const definitions: DockButtonDefinition[] = [
      { label: 'Время', glyph: isNight ? 'Ночь' : 'День', action: this.callbacks.onToggleDayNight },
      { label: 'Масштаб', glyph: '−', action: this.callbacks.onZoomOut },
      { label: 'Центр', glyph: '⌂', action: this.callbacks.onResetView },
      { label: 'Масштаб', glyph: '+', action: this.callbacks.onZoomIn },
    ];

    const cellW = 58;
    const cellH = 44;
    const gap = 4;
    const width = definitions.length * cellW + (definitions.length - 1) * gap + 12;
    const bg = this.scene.add
      .rectangle(0, 0, width, cellH + 10, HUB_THEME.color.shadow, 0.9)
      .setStrokeStyle(1, HUB_THEME.color.panelBorder, 0.65);
    root.add(bg);

    definitions.forEach((definition, index) => {
      const x = -width / 2 + 6 + cellW / 2 + index * (cellW + gap);
      const button = this.createDockButton(x, definition, index === 2);
      root.add(button);
      if (index === 0) {
        this.timeText = button.getData('glyphText');
      }
    });

    return root;
  }

  private createDockButton(x: number, definition: DockButtonDefinition, emphasized: boolean): any {
    const root = this.scene.add.container(x, 0);
    const bg = this.scene.add
      .rectangle(0, 0, 58, 44, emphasized ? HUB_THEME.color.panelElevated : HUB_THEME.color.panel, 0.96)
      .setStrokeStyle(1, emphasized ? HUB_THEME.color.primary : HUB_THEME.color.panelBorder, emphasized ? 0.9 : 0.55)
      .setInteractive({ useHandCursor: true });
    const glyph = this.scene.add
      .text(0, -6, definition.glyph, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: definition.glyph.length > 2 ? '9px' : '13px',
        color: emphasized ? HUB_THEME.css.primary : HUB_THEME.css.textPrimary,
      })
      .setOrigin(0.5);
    const label = this.scene.add
      .text(0, 9, definition.label, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '8px',
        color: HUB_THEME.css.textSecondary,
      })
      .setOrigin(0.5);

    root.setData('glyphText', glyph);
    bg.on('pointerover', () => {
      root.setY(-1);
      bg.setStrokeStyle(1, HUB_THEME.color.primaryHighlight, 0.9);
    });
    bg.on('pointerout', () => {
      root.setY(0);
      bg.setStrokeStyle(1, emphasized ? HUB_THEME.color.primary : HUB_THEME.color.panelBorder, emphasized ? 0.9 : 0.55);
    });
    bg.on('pointerdown', definition.action);

    root.add([bg, glyph, label]);
    return root;
  }

  public setNight(isNight: boolean): void {
    this.timeText?.setText(isNight ? 'Ночь' : 'День');
  }

  public layout(viewportWidth: number, viewportHeight: number): void {
    this.stationChip.setPosition(92, 25);
    this.dock.setPosition(viewportWidth / 2, viewportHeight - 34);
  }

  public destroy(): void {
    this.root?.destroy(true);
  }
}
