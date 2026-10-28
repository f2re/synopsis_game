import type { BuildingStateId } from '../../bridge/WorldBridge';
import { WORLD_LOGICAL_HEIGHT, WORLD_LOGICAL_WIDTH } from '../../runtime/fitLogicalViewport';
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
    const cardW = 448;
    const cardH = 246;
    const left = -cardW / 2;
    const top = -cardH / 2;
    const modal = this.scene.add
      .container(WORLD_LOGICAL_WIDTH / 2, WORLD_LOGICAL_HEIGHT / 2)
      .setDepth(HUB_THEME.depth.modal)
      .setScrollFactor(0);

    const backdrop = this.scene.add
      .rectangle(0, 0, WORLD_LOGICAL_WIDTH * 2, WORLD_LOGICAL_HEIGHT * 2, HUB_THEME.color.backdrop, 0.82)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const panel = this.scene.add
      .rectangle(0, 0, cardW, cardH, HUB_THEME.color.panel, 0.99)
      .setStrokeStyle(1, isLocked ? HUB_THEME.color.panelBorder : HUB_THEME.color.primary, 1);

    const header = this.scene.add
      .rectangle(0, top + 21, cardW - 2, 40, HUB_THEME.color.panelElevated, 0.99);

    const title = this.scene.add.text(left + 12, top + 8, dossier.title, {
      fontFamily: HUB_THEME.font.display,
      fontSize: '10px',
      color: HUB_THEME.css.textPrimary,
    });

    const subtitle = this.scene.add.text(left + 12, top + 23, dossier.subtitle, {
      fontFamily: HUB_THEME.font.dense,
      fontSize: '6px',
      color: HUB_THEME.css.textSecondary,
      wordWrap: { width: cardW - 48 },
      lineSpacing: 1,
    });

    const closeBg = this.scene.add
      .rectangle(cardW / 2 - 15, top + 15, 22, 22, HUB_THEME.color.shadow, 0.8)
      .setStrokeStyle(1, HUB_THEME.color.panelBorder, 0.75)
      .setInteractive({ useHandCursor: true });
    const closeText = this.scene.add
      .text(cardW / 2 - 15, top + 15, '×', {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '9px',
        color: HUB_THEME.css.textPrimary,
      })
      .setOrigin(0.5);
    closeBg.on('pointerdown', () => this.close());

    const previewX = left + 76;
    const previewY = top + 83;
    const preview = this.scene.textures.exists(dossier.textureKey)
      ? this.scene.add.image(previewX, previewY, dossier.textureKey).setDisplaySize(128, 72)
      : this.scene.add.rectangle(previewX, previewY, 128, 72, HUB_THEME.color.shadow, 0.9);

    const statusColor = isLocked ? HUB_THEME.css.lockedText : HUB_THEME.css.success;
    const statusLabel = isLocked
      ? dossier.lockedStatusLabel ?? 'Закрыто'
      : dossier.availableStatusLabel;
    const status = this.scene.add
      .text(previewX, previewY + 45, statusLabel, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '6px',
        color: statusColor,
        backgroundColor: '#071624',
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5);

    const specs = this.scene.add.container(left + 154, top + 51);
    let specY = 0;
    for (const spec of dossier.specs) {
      const label = this.scene.add.text(0, specY, spec.label, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '6px',
        color: HUB_THEME.css.primary,
      });
      const value = this.scene.add.text(0, specY + 9, spec.value, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '6px',
        color: HUB_THEME.css.textPrimary,
        wordWrap: { width: cardW - 174 },
        lineSpacing: 1,
      });
      specs.add([label, value]);
      specY += 14 + value.height;
    }

    const elements: any[] = [backdrop, panel, header, title, subtitle, closeBg, closeText, preview, status, specs];

    if (dossier.keeper) {
      const keeperName = this.scene.add.text(left + 12, top + 142, dossier.keeper.name, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '6px',
        color: HUB_THEME.css.primary,
      });
      const keeperQuote = this.scene.add.text(left + 12, top + 153, `«${dossier.keeper.quote}»`, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '6px',
        color: HUB_THEME.css.textPrimary,
        wordWrap: { width: 132 },
        lineSpacing: 1,
      });
      const humanDetail = this.scene.add.text(
        left + 12,
        top + 158 + keeperQuote.height,
        dossier.keeper.humanDetail,
        {
          fontFamily: HUB_THEME.font.dense,
          fontSize: '5px',
          color: HUB_THEME.css.textSecondary,
          wordWrap: { width: 132 },
          lineSpacing: 1,
        },
      );
      elements.push(keeperName, keeperQuote, humanDetail);
    }

    if (isLocked && dossier.unlockRequirement) {
      const requirement = this.scene.add.text(
        left + 154,
        cardH / 2 - 38,
        `Условие открытия: ${dossier.unlockRequirement}`,
        {
          fontFamily: HUB_THEME.font.dense,
          fontSize: '5px',
          color: HUB_THEME.css.lockedText,
          wordWrap: { width: cardW - 174 },
          backgroundColor: '#34465C',
          padding: { x: 5, y: 4 },
          lineSpacing: 1,
        },
      );
      elements.push(requirement);
    }

    if (!isLocked && dossier.action) {
      const actionX = cardW / 2 - 70;
      const actionY = cardH / 2 - 18;
      const actionBg = this.scene.add
        .rectangle(actionX, actionY, 116, 24, HUB_THEME.color.primary, 1)
        .setStrokeStyle(1, HUB_THEME.color.primaryHighlight, 1)
        .setInteractive({ useHandCursor: true });
      const actionText = this.scene.add
        .text(actionX, actionY, dossier.action.label, {
          fontFamily: HUB_THEME.font.display,
          fontSize: '7px',
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
