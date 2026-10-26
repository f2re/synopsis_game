import type { HubPoint, HubRect, TooltipDirection } from './locationRegistry';

export interface HubCardPlacementInput {
  anchor: HubPoint;
  width: number;
  height: number;
  preferred: TooltipDirection;
  alternatives: readonly TooltipDirection[];
  visibleBounds: HubRect;
  reserved?: readonly HubRect[];
  gap?: number;
}

export interface HubCardPlacement extends HubPoint {
  direction: TooltipDirection;
}

function intersects(a: HubRect, b: HubRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function centeredRect(x: number, y: number, width: number, height: number): HubRect {
  return { x: x - width / 2, y: y - height / 2, width, height };
}

function candidate(anchor: HubPoint, width: number, height: number, direction: TooltipDirection, gap: number): HubPoint {
  switch (direction) {
    case 'top':
      return { x: anchor.x, y: anchor.y - gap - height / 2 };
    case 'right':
      return { x: anchor.x + gap + width / 2, y: anchor.y };
    case 'bottom':
      return { x: anchor.x, y: anchor.y + gap + height / 2 };
    case 'left':
      return { x: anchor.x - gap - width / 2, y: anchor.y };
  }
}

function inside(rect: HubRect, bounds: HubRect): boolean {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.width <= bounds.x + bounds.width &&
    rect.y + rect.height <= bounds.y + bounds.height
  );
}

function clampToBounds(point: HubPoint, width: number, height: number, bounds: HubRect): HubPoint {
  const halfW = width / 2;
  const halfH = height / 2;
  return {
    x: Math.min(bounds.x + bounds.width - halfW, Math.max(bounds.x + halfW, point.x)),
    y: Math.min(bounds.y + bounds.height - halfH, Math.max(bounds.y + halfH, point.y)),
  };
}

export function placeHubCard(input: HubCardPlacementInput): HubCardPlacement {
  const gap = input.gap ?? 12;
  const directions = [input.preferred, ...input.alternatives.filter((d) => d !== input.preferred)];

  for (const direction of directions) {
    const point = candidate(input.anchor, input.width, input.height, direction, gap);
    const rect = centeredRect(point.x, point.y, input.width, input.height);
    if (!inside(rect, input.visibleBounds)) continue;
    if ((input.reserved ?? []).some((reserved) => intersects(rect, reserved))) continue;
    return { ...point, direction };
  }

  const fallback = clampToBounds(
    candidate(input.anchor, input.width, input.height, input.preferred, gap),
    input.width,
    input.height,
    input.visibleBounds,
  );
  return { ...fallback, direction: input.preferred };
}
