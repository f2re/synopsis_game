import type { BuildingStateId } from '../../bridge/WorldBridge';
import { FACILITY_DOSSIERS } from './facilityDossiers';
import { HUB_THEME } from './hubTheme';

export interface HubDossierCallbacks {
  onStartShift: () => void;
  onOpenScene: (sceneKey: string) => void;
}

export class HubDossierLayer {
  private readonly scene: any;
  private modal?: any;
  private readonly callbacks: HubDossierCallbacks;

  constructor(scene: any, callbacks: HubDossierCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.scene.input.keyboard?.on('keydown-ESC', this.handleEscape, this);
  }

  private handleEscape(): void {
    this.close();
  }

  public get isOpen(): boolean {
    return Boolean(this.modal?.active);
  }

  public open(dossierId: string, buildingState: BuildingStateId): void {
    const dossier = FACILITY_DOSSIERS[dossierId];
    if (!dossier) return;

    this.close();

    const isLocked = buildingState === 'locked';
    const vpW = this.scene.scale.width;
    const vpH = this.scene.scale.height;
    const cardW = Math.min(620, vpW - 32);
    const cardH = Math.min(460, vpH - 32);
    const modal = this.scene.add.container(vpW / 2, vpH / 2).setDepth(HUB_THEME.depth.modal).setScrollFactor(0);

    const backdrop = this.scene.add
      .rectangle(0, 0, vpW * 2, vpH * 2, HUB_THEME.color.backdrop, 0.78)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const panel = this.scene.add
      .rectangle(0, 0, cardW, cardH, HUB_THEME.color.panel, 0.985)
      .setStrokeStyle(2, isLocked ? HUB_THEME.color.panelBorder : HUB_THEME.color.primary, 0.95);

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

    const statusColor = isLocked ? HUB_THEME.css.lockedText : HUB_THEME.css.success;
    const statusLabel = isLocked
      ? dossier.lockedStatusLabel ?? 'Закрыто'
      : dossier.availableStatusLabel;
    const status = this.scene.add
      .text(previewX, previewY + 86, statusLabel, {
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

    if (dossier.keeper) {
      const keeperName = this.scene.add.text(-cardW / 2 + 24, previewY + 105, dossier.keeper.name, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '10px',
        color: HUB_THEME.css.primary,
      });
      const keeperQuote = this.scene.add.text(-cardW / 2 + 24, previewY + 122, `«${dossier.keeper.quote}»`, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '9px',
        color: HUB_THEME.css.textPrimary,
        wordWrap: { width: 204 },
        lineSpacing: 2,
      });
      const humanDetail = this.scene.add.text(
        -cardW / 2 + 24,
        previewY + 128 + keeperQuote.height,
        dossier.keeper.humanDetail,
        {
          fontFamily: HUB_THEME.font.dense,
          fontSize: '8px',
          color: HUB_THEME.css.textSecondary,
          wordWrap: { width: 204 },
          lineSpacing: 1,
        },
      );
      elements.push(keeperName, keeperQuote, humanDetail);
    }

    if (isLocked && dossier.unlockRequirement) {
      const requirement = this.scene.add
        .text(-cardW / 2 + 252, cardH / 2 - 68, `Условие открытия: ${dossier.unlockRequirement}`, {
          fontFamily: HUB_THEME.font.dense,
          fontSize: '9px',
          color: HUB_THEME.css.lockedText,
          wordWrap: { width: cardW - 292 },
          backgroundColor: '#34465C',
          padding: { x: 8, y: 6 },
        });
      elements.push(requirement);
    }

    if (!isLocked && dossier.action) {
      const actionBg = this.scene.add
        .rectangle(cardW / 2 - 116, cardH / 2 - 30, 184, 44, HUB_THEME.color.primary, 1)
        .setStrokeStyle(1, HUB_THEME.color.primaryHighlight, 1)
        .setInteractive({ useHandCursor: true });
      const actionText = this.scene.add
        .text(cardW / 2 - 116, cardH / 2 - 30, dossier.action.label, {
          fontFamily: HUB_THEME.font.display,
          fontSize: '12px',
          color: '#143F4C',
        })
        .setOrigin(0.5);
      actionBg.on('pointerover', () => actionBg.setFillStyle(HUB_THEME.color.primaryHighlight, 1));
      actionBg.on('pointerout', () => actionBg.setFillStyle(HUB_THEME.color.primary, 1));
      actionBg.on('pointerdown', () => {
        const action = dossier.action;
        this.close();
        if (!action) return;
        if (action.kind === 'start-shift') {
          this.callbacks.onStartShift();
          return;
        }
        if (action.sceneKey) this.callbacks.onOpenScene(action.sceneKey);
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
