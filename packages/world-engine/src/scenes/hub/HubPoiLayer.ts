import Phaser from 'phaser';
import { HUB_THEME } from './hubTheme';
import { placeHubCard } from './hubLayout';
import { getLocationNotice, type HubLocationDefinition } from './locationRegistry';
import { createHubPoiCard } from './createHubPoiCard';

export interface HubPoiCallbacks {
  onStartShift: () => void;
  onDetails: (location: HubLocationDefinition) => void;
  isBlocked?: () => boolean;
}

interface PoiItem {
  location: HubLocationDefinition;
  zone: any;
  outline: any;
  marker: any;
  markerBg: any;
  markerHit: any;
  card?: any;
  selected: boolean;
  hovered: boolean;
  focused: boolean;
}

export class HubPoiLayer {
  private readonly scene: any;
  private readonly locations: readonly HubLocationDefinition[];
  private readonly callbacks: HubPoiCallbacks;
  private readonly reducedMotion: boolean;
  private readonly items: PoiItem[] = [];
  private selected?: PoiItem;
  private focusIndex = -1;

  constructor(
    scene: any,
    locations: readonly HubLocationDefinition[],
    callbacks: HubPoiCallbacks,
  ) {
    this.scene = scene;
    this.locations = [...locations].sort((a, b) => b.priority - a.priority);
    this.callbacks = callbacks;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.create();
    this.bindKeyboard();
  }

  private create(): void {
    for (const location of this.locations) {
      const outline = this.scene.add
        .image(location.outline.x, location.outline.y, location.outline.textureKey)
        .setOrigin(0, 0)
        .setDepth(HUB_THEME.depth.outline)
        .setAlpha(0);

      const marker = this.createMarker(location);
      const markerBg = marker.getData('markerBg');
      const markerHit = marker.getData('markerHit');

      const zone = this.scene.add
        .zone(
          location.hitArea.x + location.hitArea.width / 2,
          location.hitArea.y + location.hitArea.height / 2,
          location.hitArea.width,
          location.hitArea.height,
        )
        .setDepth(HUB_THEME.depth.poi)
        .setInteractive({ useHandCursor: true });

      const item: PoiItem = {
        location,
        zone,
        outline,
        marker,
        markerBg,
        markerHit,
        selected: false,
        hovered: false,
        focused: false,
      };
      this.items.push(item);

      zone.setData('semanticId', location.id);
      zone.on('pointerover', () => this.handlePointerOver(item));
      zone.on('pointerout', () => this.handlePointerOut(item));
      zone.on('pointerup', () => this.select(item));

      markerHit.on('pointerover', () => this.handlePointerOver(item));
      markerHit.on('pointerout', () => this.handlePointerOut(item));
      markerHit.on('pointerup', () => this.select(item));
    }

    this.refreshScale();
  }

  private createMarker(location: HubLocationDefinition): any {
    const root = this.scene.add
      .container(location.markerAnchor.x, location.markerAnchor.y)
      .setDepth(HUB_THEME.depth.poi + 1);

    const isOpen = location.state === 'available' || location.state === 'active';
    const markerBg = isOpen
      ? this.scene.add
          .circle(0, 0, 10, HUB_THEME.color.panel, 0.94)
          .setStrokeStyle(1.5, location.state === 'active' ? HUB_THEME.color.primaryHighlight : HUB_THEME.color.primary, 0.96)
      : this.scene.add
          .rectangle(0, 0, 22, 18, location.state === 'disabled' ? HUB_THEME.color.disabledPanel : HUB_THEME.color.lockedPanel, 0.94)
          .setStrokeStyle(1, HUB_THEME.color.panelBorder, 0.7);

    const markerHit = this.scene.add
      .rectangle(0, 0, 44, 44, HUB_THEME.color.panel, 0.001)
      .setInteractive({ useHandCursor: true });

    const glyph = this.scene.add
      .text(0, 0, location.markerGlyph, {
        fontFamily: HUB_THEME.font.dense,
        fontSize: location.markerGlyph.length > 1 ? '8px' : '10px',
        color: isOpen ? HUB_THEME.css.primary : HUB_THEME.css.lockedText,
      })
      .setOrigin(0.5);

    root.setData('markerBg', markerBg);
    root.setData('markerHit', markerHit);
    root.add([markerHit, markerBg, glyph]);

    if (location.state === 'active' && !this.reducedMotion) {
      this.scene.tweens.add({
        targets: markerBg,
        alpha: 0.7,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return root;
  }

  private isBlocked(): boolean {
    return this.callbacks.isBlocked?.() ?? false;
  }

  private handlePointerOver(item: PoiItem): void {
    if (this.isBlocked()) return;
    item.hovered = true;
    this.showFocus(item, false);
  }

  private handlePointerOut(item: PoiItem): void {
    item.hovered = false;
    if (!item.selected && !item.focused) {
      this.hideFocus(item);
    }
  }

  private showFocus(item: PoiItem, selected: boolean): void {
    this.scene.tweens.killTweensOf(item.outline);
    item.outline.setTint(selected ? HUB_THEME.color.primaryHighlight : HUB_THEME.color.focus);
    if (this.reducedMotion) {
      item.outline.setAlpha(selected ? 0.8 : 0.58);
    } else {
      this.scene.tweens.add({
        targets: item.outline,
        alpha: selected ? 0.8 : 0.58,
        duration: 110,
        ease: 'Cubic.easeOut',
      });
    }
    item.markerBg.setStrokeStyle(
      selected ? 2 : 1.5,
      selected ? HUB_THEME.color.primaryHighlight : HUB_THEME.color.focus,
      0.95,
    );
    this.renderCard(item, selected);
  }

  private hideFocus(item: PoiItem): void {
    this.scene.tweens.killTweensOf(item.outline);
    if (this.reducedMotion) {
      item.outline.setAlpha(0);
    } else {
      this.scene.tweens.add({
        targets: item.outline,
        alpha: 0,
        duration: 120,
        ease: 'Cubic.easeIn',
      });
    }
    this.resetMarkerStyle(item);
    this.destroyCard(item);
  }

  private resetMarkerStyle(item: PoiItem): void {
    const isOpen = item.location.state === 'available' || item.location.state === 'active';
    item.markerBg.setStrokeStyle(
      isOpen ? 1.5 : 1,
      isOpen ? HUB_THEME.color.primary : HUB_THEME.color.panelBorder,
      isOpen ? 0.96 : 0.7,
    );
  }

  private select(item: PoiItem): void {
    if (this.isBlocked()) return;

    if (this.selected && this.selected !== item) {
      this.selected.selected = false;
      if (!this.selected.hovered && !this.selected.focused) {
        this.hideFocus(this.selected);
      }
    }

    item.selected = true;
    this.selected = item;
    this.showFocus(item, true);
  }

  public clearSelection(): void {
    if (!this.selected) return;
    const previous = this.selected;
    previous.selected = false;
    this.selected = undefined;
    if (!previous.hovered && !previous.focused) {
      this.hideFocus(previous);
    } else {
      this.showFocus(previous, false);
    }
  }

  private renderCard(item: PoiItem, selected: boolean): void {
    this.destroyCard(item);
    item.card = createHubPoiCard(this.scene, item.location, selected, this.callbacks);
  }

  private destroyCard(item: PoiItem): void {
    item.card?.destroy(true);
    item.card = undefined;
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    keyboard.on('keydown-TAB', this.handleTab, this);
    keyboard.on('keydown-SPACE', this.handleSpace, this);
    keyboard.on('keydown-ENTER', this.handleEnter, this);
    keyboard.on('keydown-ESC', this.handleEscape, this);
  }

  private handleTab(event: any): void {
    if (this.isBlocked()) return;
    event.preventDefault?.();
    const direction = event.shiftKey ? -1 : 1;
    const next = (this.focusIndex + direction + this.items.length) % this.items.length;
    this.setKeyboardFocus(next);
  }

  private handleSpace(event: any): void {
    if (this.isBlocked() || this.focusIndex < 0) return;
    event.preventDefault?.();
    this.select(this.items[this.focusIndex]);
  }

  private handleEnter(event: any): void {
    if (this.isBlocked() || this.focusIndex < 0) return;
    event.preventDefault?.();
    const item = this.items[this.focusIndex];
    if (!item.selected) {
      this.select(item);
      return;
    }
    if (item.location.state === 'available' || item.location.state === 'active') {
      this.callbacks.onStartShift();
    } else {
      this.callbacks.onDetails(item.location);
    }
  }

  private handleEscape(): void {
    this.clearSelection();
  }

  private setKeyboardFocus(index: number): void {
    if (this.focusIndex >= 0) {
      const previous = this.items[this.focusIndex];
      previous.focused = false;
      if (!previous.selected && !previous.hovered) this.hideFocus(previous);
    }
    this.focusIndex = index;
    const next = this.items[index];
    next.focused = true;
    this.showFocus(next, next.selected);
  }

  public refreshScale(): void {
    const zoom = Math.max(this.scene.cameras.main.zoom, 0.001);
    for (const item of this.items) {
      item.marker.setScale(1 / zoom);
      if (item.card) {
        this.renderCard(item, item.selected);
      }
    }
  }

  public destroy(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-TAB', this.handleTab, this);
    keyboard?.off('keydown-SPACE', this.handleSpace, this);
    keyboard?.off('keydown-ENTER', this.handleEnter, this);
    keyboard?.off('keydown-ESC', this.handleEscape, this);
    for (const item of this.items) {
      item.zone.destroy();
      item.outline.destroy();
      item.marker.destroy(true);
      this.destroyCard(item);
    }
    this.items.length = 0;
  }
}
