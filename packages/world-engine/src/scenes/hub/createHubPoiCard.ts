import Phaser from 'phaser';
import { HUB_THEME } from './hubTheme';
import { placeHubCard } from './hubLayout';
import { getLocationNotice, type HubLocationDefinition } from './locationRegistry';
import type { HubPoiCallbacks } from './HubPoiLayer';

export function createHubPoiCard(
  scene: any,
  location: HubLocationDefinition,
  selected: boolean,
  callbacks: HubPoiCallbacks,
): Phaser.GameObjects.Container {
  const camera = scene.cameras.main;
  const zoom = Math.max(camera.zoom, 0.001);
  const cardW = selected ? 224 : 188;
  const cardH = selected ? 126 : 50;
  const root = scene.add.container(0, 0).setDepth(HUB_THEME.depth.card);
  root.setScale(1 / zoom);

  const state = location.state;
  const panelColor = state === 'disabled'
    ? HUB_THEME.color.disabledPanel
    : state === 'locked'
      ? HUB_THEME.color.lockedPanel
      : HUB_THEME.color.panel;
  const borderColor = selected
    ? HUB_THEME.color.primaryHighlight
    : state === 'locked'
      ? HUB_THEME.color.panelBorder
      : HUB_THEME.color.primary;

  const bg = scene.add
    .rectangle(0, 0, cardW, cardH, panelColor, 0.97)
    .setStrokeStyle(selected ? 2 : 1, borderColor, selected ? 0.96 : 0.76);

  const title = scene.add
    .text(-cardW / 2 + 12, -cardH / 2 + 10, location.shortTitle, {
      fontFamily: HUB_THEME.font.display,
      fontSize: '11px',
      color: HUB_THEME.css.textPrimary,
    });

  const notice = scene.add
    .text(-cardW / 2 + 12, -cardH / 2 + 27, getLocationNotice(location), {
      fontFamily: HUB_THEME.font.dense,
      fontSize: '9px',
      color: state === 'locked' ? HUB_THEME.css.lockedText : HUB_THEME.css.success,
      wordWrap: { width: cardW - 24 },
    });

  root.add([bg, title, notice]);

  if (selected) {
    const subtitle = scene.add
      .text(-cardW / 2 + 12, -cardH / 2 + 47, location.subtitle, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: '9px',
        color: HUB_THEME.css.textSecondary,
        wordWrap: { width: cardW - 24 },
      });
    root.add(subtitle);

    if (state === 'available' || state === 'active') {
      const shift = createPoiCardButton(scene, -51, cardH / 2 - 28, 98, 'Начать смену', true, () => callbacks.onStartShift());
      const details = createPoiCardButton(scene, 57, cardH / 2 - 28, 94, 'Подробнее', false, () => callbacks.onDetails(location));
      root.add([shift, details]);
    } else {
      const details = createPoiCardButton(scene, 0, cardH / 2 - 28, 104, 'Подробнее', false, () => callbacks.onDetails(location));
      root.add(details);
    }
  }

  const safeTop = 52 / zoom;
  const safeBottom = 66 / zoom;
  const pad = 12 / zoom;
  const view = camera.worldView;
  const visibleBounds = {
    x: view.x + pad,
    y: view.y + safeTop,
    width: Math.max(1, view.width - pad * 2),
    height: Math.max(1, view.height - safeTop - safeBottom),
  };
  const reserved = [
    {
      x: view.x + view.width - 184 / zoom,
      y: view.y,
      width: 184 / zoom,
      height: 72 / zoom,
    },
    {
      x: view.centerX - 170 / zoom,
      y: view.y + view.height - 62 / zoom,
      width: 340 / zoom,
      height: 62 / zoom,
    },
  ];

  const placement = placeHubCard({
    anchor: location.markerAnchor,
    width: cardW / zoom,
    height: cardH / zoom,
    preferred: location.preferredTooltipDirection,
    alternatives: location.tooltipAlternatives,
    visibleBounds,
    reserved,
    gap: 13 / zoom,
  });

  root.setPosition(placement.x, placement.y);
  return root;
}

function createPoiCardButton(
  scene: any,
  x: number,
  y: number,
  width: number,
  label: string,
  primary: boolean,
  action: () => void,
): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y);
  const fill = primary ? HUB_THEME.color.primary : HUB_THEME.color.panelElevated;
  const hover = primary ? HUB_THEME.color.primaryHighlight : HUB_THEME.color.panelBorder;
  const textColor = primary ? '#143F4C' : HUB_THEME.css.textPrimary;
  const bg = scene.add
    .rectangle(0, 0, width, 44, fill, 1)
    .setStrokeStyle(1, primary ? HUB_THEME.color.primaryHighlight : HUB_THEME.color.panelBorder, 0.9)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: HUB_THEME.font.dense,
      fontSize: '9px',
      color: textColor,
    })
    .setOrigin(0.5);
  bg.on('pointerover', () => {
    root.setY(y - 1);
    bg.setFillStyle(hover, 1);
  });
  bg.on('pointerout', () => {
    root.setY(y);
    bg.setFillStyle(fill, 1);
  });
  bg.on('pointerdown', action);
  root.add([bg, text]);
  return root;
}
