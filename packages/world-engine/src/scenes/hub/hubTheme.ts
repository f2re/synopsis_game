/**
 * Runtime adapter for design/tokens/pixel-art-theme.yaml.
 * Keep values synchronized with the accepted art-direction tokens.
 * Phaser numeric colors are always RGB (0xRRGGBB); alpha is a separate argument.
 */
export const HUB_THEME = {
  color: {
    panel: 0x143f4c,
    panelElevated: 0x1b5660,
    panelBorder: 0x6f9e95,
    textPrimary: 0xf7f3e8,
    textSecondary: 0xc9d9d2,
    primary: 0xf2c75c,
    primaryHighlight: 0xffdd83,
    success: 0x5faf78,
    warning: 0xd89a52,
    focus: 0xf0d476,
    lockedPanel: 0x34465c,
    disabledPanel: 0x3c4857,
    lockedText: 0xc1cad1,
    shadow: 0x071624,
    backdrop: 0x06111a,
  },
  css: {
    textPrimary: '#F7F3E8',
    textSecondary: '#C9D9D2',
    primary: '#F2C75C',
    primaryHighlight: '#FFDD83',
    success: '#5FAF78',
    warning: '#D89A52',
    lockedText: '#C1CAD1',
  },
  font: {
    display: 'PixCyrillic, monospace',
    dense: 'PixCyrillic-Dense, PixCyrillic, monospace',
    mono: 'PressStart2P, monospace',
  },
  depth: {
    outline: 24,
    poi: 48,
    card: 70,
    hud: 400,
    modal: 600,
  },
} as const;
