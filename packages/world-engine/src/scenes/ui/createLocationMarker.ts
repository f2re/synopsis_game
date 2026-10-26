import Phaser from 'phaser';
import type { HubLocationDefinition } from '../hub/locationRegistry';

export interface LocationMarkerOptions {
  location: HubLocationDefinition;
  onOpen: (location: HubLocationDefinition) => void;
  onBlocked: (location: HubLocationDefinition) => void;
}

const PANEL = 0x17384c;
const PANEL_LOCKED = 0x34465c;
const BORDER = 0xd7e6df;
const BORDER_ACTIVE = 0xf2c75c;

export function createLocationMarker(
  scene: Phaser.Scene,
  options: LocationMarkerOptions,
): Phaser.GameObjects.Container {
  const { location } = options;
  const locked = location.state === 'locked' || location.state === 'disabled';
  const width = 112;
  const height = 31;

  const panel = scene.add
    .rectangle(0, 0, width, height, locked ? PANEL_LOCKED : PANEL, locked ? 0.92 : 0.96)
    .setStrokeStyle(1, locked ? BORDER : BORDER_ACTIVE);

  const title = scene.add
    .text(-48, -8, location.title, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f6f4e9',
      wordWrap: { width: 86 },
    })
    .setOrigin(0, 0.5);

  const subtitle = scene.add
    .text(-48, 8, locked ? (location.unlockHint ?? 'Заблокировано') : location.subtitle, {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: locked ? '#c1cad1' : '#eddc9d',
      wordWrap: { width: 90 },
    })
    .setOrigin(0, 0.5);

  const icon = scene.add.graphics();
  if (locked) {
    icon.lineStyle(2, 0xd6dde4, 1);
    icon.strokeRect(-47, -2, 8, 8);
    icon.strokeRoundedRect(-45, -7, 4, 6, 2);
  } else {
    icon.fillStyle(0xf2c75c, 1);
    icon.fillRect(-46, -5, 6, 10);
    icon.fillStyle(0xffe7a0, 1);
    icon.fillRect(-44, -3, 2, 6);
  }

  const container = scene.add.container(location.x, location.y, [panel, icon, title, subtitle]);
  container.setSize(width, height).setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    panel.setStrokeStyle(1, locked ? 0xaeb8c4 : 0xffdf7a);
  });

  container.on('pointerout', () => {
    panel.setStrokeStyle(1, locked ? BORDER : BORDER_ACTIVE);
  });

  container.on('pointerdown', () => {
    if (locked) {
      options.onBlocked(location);
      return;
    }
    options.onOpen(location);
  });

  return container;
}
