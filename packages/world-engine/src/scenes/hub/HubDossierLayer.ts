import Phaser from 'phaser';
import { FACILITY_DOSSIERS } from './facilityDossiers';
import { HUB_THEME } from './hubTheme';

export class HubDossierLayer {
  private readonly scene: any;
  private modal?: any;
  private readonly onStartShift: () => void;

  constructor(scene: any, onStartShift: () => void) {
    this.scene = scene;
    this.onStartShift = onStartShift;
    this.scene.input.keyboard?.on('keydown-ESC', this.handleEscape, this);
  }

  private handleEscape(): void {
    this.close();
  }

  public get isOpen(): boolean {
    return Boolean(this.modal?.active);
  }

  public open(dossierId: string): void {
    const dossier = FACILITY_DOSSIERS[dossierId];
    if (!dossier) return;

    this.close();

    const vpW = this.scene.scale.width;
    const vpH = this.scene.scale.height;
    const cardW = Math.min(620, vpW - 32);
    const cardH = Math.min(420, vpH - 32);
    const modal = this.scene.add.container(vpW / 2, vpH / 2).setDepth(HUB_THEME.depth.modal).setScrollFactor(0);

    const backdrop = this.scene.add
      .rectangle(0, 0, vpW * 2, vpH * 2, HUB_THEME.color.backdrop, 0.78)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const panel = this.scene.add
      .rectangle(0, 0, cardW, cardH, HUB_THEME.color.panel, 0.985)
      .setStrokeStyle(2, dossier.isLocked ? HUB_THEME.color.panelBorder : HUB_THEME.color.primary, 0.95);

    const header = this.scene.add
      .rectangle(0, -cardH / 2 + 34, cardW - 4, 64, HUB_THEME.color.panelElevated, 0.98);

    const title = this.scene.add
      .text(-cardW / 2 + 24, -cardH / 2 + 20, dossier.title, {
        fontFamily: HUB_THEME.font.display,
        fontSize: '18px',
        color: HUB_THEME.css.textPrimary,
      });

    const subtitle = this.scene.add
      .text(-cardW / 2 + 24, -cardH / 2 + 46, dossier.subtitle, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '11px',
        color: HUB_THEME.css.textSecondary,
        wordWrap: { width: cardW - 90 },
      });

    const closeBg = this.scene.add
      .rectangle(cardW / 2 - 28, -cardH / 2 + 28, 44, 44, HUB_THEME.color.shadow, 0.76)
      .setStrokeStyle(1, HUB_THEME.color.panelBorder, 0.65)
      .setInteractive({ useHandCursor: true });
    const closeText = this.scene.add
      .text(cardW / 2 - 28, -cardH / 2 + 28, '×', {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '16px',
        color: HUB_THEME.css.textPrimary,
      })
      .setOrigin(0.5);
    closeBg.on('pointerdown', () => this.close());

    const previewX = -cardW / 2 + 126;
    const previewY = -cardH / 2 + 168;
    const preview = this.scene.textures.exists(dossier.textureKey)
      ? this.scene.add.image(previewX, previewY, dossier.textureKey).setDisplaySize(204, 146)
      : this.scene.add.rectangle(previewX, previewY, 204, 146, HUB_THEME.color.shadow, 0.9);

    const statusColor = dossier.isLocked ? HUB_THEME.css.lockedText : HUB_THEME.css.success;
    const status = this.scene.add
      .text(previewX, previewY + 88, dossier.statusLabel, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '11px',
        color: statusColor,
        backgroundColor: '#071624',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5);

    const specs = this.scene.add.container(-cardW / 2 + 252, -cardH / 2 + 92);
    let specY = 0;
    for (const spec of dossier.specs) {
      const label = this.scene.add.text(0, specY, spec.label, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '11px',
        color: HUB_THEME.css.primary,
      });
      const value = this.scene.add.text(0, specY + 17, spec.value, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '10px',
        color: HUB_THEME.css.textPrimary,
        wordWrap: { width: cardW - 292 },
        lineSpacing: 2,
      });
      specs.add([label, value]);
      specY += 28 + value.height;
    }

    const elements: any[] = [backdrop, panel, header, title, subtitle, closeBg, closeText, preview, status, specs];

    if (dossier.isLocked && dossier.unlockRequirement) {
      const requirement = this.scene.add
        .text(-cardW / 2 + 24, cardH / 2 - 74, `Условие открытия: ${dossier.unlockRequirement}`, {
          fontFamily: HUB_THEME.font.dense,
          fontSize: '10px',
          color: HUB_THEME.css.lockedText,
          wordWrap: { width: cardW - 48 },
          backgroundColor: '#34465C',
          padding: { x: 10, y: 7 },
        });
      elements.push(requirement);
    }

    if (!dossier.isLocked) {
      const actionBg = this.scene.add
        .rectangle(0, cardH / 2 - 30, 164, 44, HUB_THEME.color.primary, 1)
        .setStrokeStyle(1, HUB_THEME.color.primaryHighlight, 1)
        .setInteractive({ useHandCursor: true });
      const actionText = this.scene.add
        .text(0, cardH / 2 - 30, 'Начать смену', {
          fontFamily: HUB_THEME.font.display,
          fontSize: '12px',
          color: '#143F4C',
        })
        .setOrigin(0.5);
      actionBg.on('pointerover', () => actionBg.setFillStyle(HUB_THEME.color.primaryHighlight, 1));
      actionBg.on('pointerout', () => actionBg.setFillStyle(HUB_THEME.color.primary, 1));
      actionBg.on('pointerdown', () => {
        this.close();
        this.onStartShift();
      });
      elements.push(actionBg, actionText);
    }

    modal.add(elements);
    this.modal = modal;
  }

  public close(): void {
    if (!this.modal) return;
    this.modal.destroy(true);
    this.modal = undefined;
  }

  public destroy(): void {
    this.scene.input.keyboard?.off('keydown-ESC', this.handleEscape, this);
    this.close();
  }
}
