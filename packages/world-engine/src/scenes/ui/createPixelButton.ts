import Phaser from 'phaser';

export type PixelButtonState = 'primary' | 'secondary' | 'locked' | 'disabled';

export interface PixelButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  state: PixelButtonState;
  onClick?: () => void;
  onUnavailable?: () => void;
}

const COLORS = {
  primary: 0xf2c75c,
  primaryHover: 0xffdc83,
  secondary: 0x174f52,
  secondaryHover: 0x22676a,
  locked: 0x33445c,
  disabled: 0x3c4857,
  border: 0xe8ddbb,
  borderFocus: 0xffdf7a,
  textDark: '#27323b',
  textLight: '#f7f3e8',
};

export function createPixelButton(
  scene: Phaser.Scene,
  options: PixelButtonOptions,
): Phaser.GameObjects.Container {
  const fill = options.state === 'primary'
    ? COLORS.primary
    : options.state === 'secondary'
      ? COLORS.secondary
      : options.state === 'locked'
        ? COLORS.locked
        : COLORS.disabled;

  const background = scene.add
    .rectangle(0, 0, options.width, options.height, fill)
    .setOrigin(0.5)
    .setStrokeStyle(1, COLORS.border);

  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: 'monospace',
      fontSize: options.height >= 24 ? '10px' : '8px',
      color: options.state === 'primary' ? COLORS.textDark : COLORS.textLight,
      align: 'center',
    })
    .setOrigin(0.5);

  const container = scene.add.container(options.x, options.y, [background, label]);
  container.setSize(options.width, options.height);

  const available = options.state === 'primary' || options.state === 'secondary';
  container.setInteractive({ useHandCursor: available });

  container.on('pointerover', () => {
    if (options.state === 'primary') {
      background.setFillStyle(COLORS.primaryHover).setStrokeStyle(1, COLORS.borderFocus);
      container.y = options.y - 1;
    } else if (options.state === 'secondary') {
      background.setFillStyle(COLORS.secondaryHover).setStrokeStyle(1, COLORS.borderFocus);
      container.y = options.y - 1;
    }
  });

  container.on('pointerout', () => {
    background.setFillStyle(fill).setStrokeStyle(1, COLORS.border);
    container.y = options.y;
  });

  container.on('pointerdown', () => {
    if (available) {
      container.y = options.y;
      options.onClick?.();
    } else {
      options.onUnavailable?.();
    }
  });

  return container;
}
