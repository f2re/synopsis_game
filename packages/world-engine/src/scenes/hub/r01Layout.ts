import { snapWorldPixelZoom } from '../../runtime/worldPixelSurface.ts';

export type HubR01BuildingId = 'codepost' | 'radar' | 'lab' | 'cartography' | 'archive' | 'hall';

export interface R01BuildingPlacement {
  id: HubR01BuildingId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'active' | 'available' | 'locked';
}

const BUILDINGS = [
  { id: 'radar', label: 'Радар', state: 'locked' },
  { id: 'lab', label: 'Аэрология', state: 'locked' },
  { id: 'codepost', label: 'Кодовый пост', state: 'active' },
  { id: 'cartography', label: 'Карты и анализ', state: 'locked' },
  { id: 'archive', label: 'Архив', state: 'available' },
  { id: 'hall', label: 'Турнирный зал', state: 'locked' },
] as const;

/** Composition boxes, not atlas coordinates. Every facade remains a separate asset. */
const LANDSCAPE = [
  [42, 68, 240, 209],
  [701, 113, 228, 220],
  [294, 137, 370, 248],
  [8, 282, 282, 180],
  [551, 310, 188, 149],
  [738, 294, 220, 164],
] as const;

const PORTRAIT = [
  [5, 72, 205, 183],
  [267, 87, 205, 183],
  [109, 235, 270, 190],
  [-5, 396, 225, 160],
  [279, 401, 190, 154],
  [265, 540, 210, 155],
] as const;

export function getR01Layout(viewportWidth: number, viewportHeight: number, pixelRatio = 1) {
  const portrait = viewportWidth / Math.max(viewportHeight, 1) < 1.1;
  const width = portrait ? 480 : 960;
  const height = portrait ? 780 : 540;
  const boxes = portrait ? PORTRAIT : LANDSCAPE;
  const fitZoom = Math.min(viewportWidth / width, viewportHeight / height);
  // Short phone viewports still expose the last entrance above the 144px dock.
  // Tall phones keep the full-width composition; only vertical pressure reduces it.
  const portraitEntranceLimit = Math.max(.1, (viewportHeight / 2 - 152 * pixelRatio) / 305);
  // The short landscape dock occupies the bottom 68 CSS pixels. Keep the
  // frontmost entrance (world y=462) and its whole hit area above that dock.
  const landscapeEntranceLimit = viewportHeight <= 540 * pixelRatio && viewportWidth > viewportHeight
    ? Math.max(.1, (viewportHeight / 2 - 76 * pixelRatio) / (462 - height / 2))
    : fitZoom;
  const ceiling = Math.min(fitZoom, portrait ? portraitEntranceLimit : landscapeEntranceLimit);
  // A desktop 1× canvas cannot fit a second integer zoom step. Use a bounded
  // closer composition there. HiDPI and narrow screens retain grid snapping.
  const closerDesktop = !portrait && pixelRatio === 1 && viewportHeight > 540 && ceiling >= 1.25 && ceiling < 2;
  const zoom = closerDesktop ? Math.min(1.375, ceiling) : snapWorldPixelZoom(ceiling);
  const offsetX = Math.round((viewportWidth - width * zoom) / 2);
  const offsetY = Math.round((viewportHeight - height * zoom) / 2);
  const buildings: R01BuildingPlacement[] = BUILDINGS.map((building, index) => {
    const [x, y, boxWidth, boxHeight] = boxes[index];
    return { ...building, x, y, width: boxWidth, height: boxHeight };
  });
  // The rear facade feet must sit below the paving plate's railing, including
  // its covered portrait height; the water band remains behind that edge.
  const horizon = portrait ? 110 : 150;
  const shore = portrait ? 150 : 190;
  return { portrait, width, height, zoom, offsetX, offsetY, buildings, horizon, shore };
}

interface R01PropPlacement {
  id: 'prop-pine' | 'prop-tree' | 'prop-hedge' | 'prop-lamp' | 'prop-bench' | 'prop-fountain';
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

/** Bottom-center anchors keep entryways free; rear foliage stays behind the facades. */
export function getR01Decor(portrait: boolean): R01PropPlacement[] {
  const rows: Array<[R01PropPlacement['id'], number, number, number, number, number]> = portrait ? [
    ['prop-pine', 0, 313, 63, 104, 3],
    ['prop-pine', 235, 308, 58, 96, 3],
    ['prop-pine', 485, 330, 70, 115, 3],
    ['prop-pine', 142, 300, 41, 68, 3],
    ['prop-pine', 267, 269, 39, 65, 3],
    ['prop-tree', 318, 344, 51, 73, 3],
    ['prop-tree', 23, 379, 74, 92, 3],
    ['prop-tree', 466, 397, 74, 92, 3],
    ['prop-pine', 58, 424, 61, 104, 3],
    ['prop-pine', 87, 406, 47, 84, 3],
    ['prop-pine', 42, 390, 53, 92, 3],
    ['prop-pine', 424, 417, 63, 110, 3],
    ['prop-pine', 400, 451, 56, 94, 3],
    ['prop-tree', 28, 534, 62, 80, 20],
    ['prop-pine', 457, 542, 74, 120, 20],
    ['prop-hedge', 41, 715, 91, 65, 30],
    ['prop-hedge', 211, 743, 91, 65, 30],
    ['prop-pine', -10, 788, 100, 165, 30],
    ['prop-pine', 492, 790, 100, 165, 30],
    ['prop-bench', 77, 650, 64, 42, 30],
    ['prop-bench', 216, 678, 64, 42, 30],
    ['prop-fountain', 148, 662, 98, 96, 30],
    ['prop-lamp', 35, 374, 18, 65, 30],
    ['prop-lamp', 448, 382, 18, 65, 30],
    ['prop-lamp', 36, 601, 18, 65, 30],
    ['prop-lamp', 251, 640, 18, 65, 30],
    ['prop-lamp', 430, 731, 18, 65, 30],
  ] : [
    ['prop-pine', -8, 337, 86, 142, 3],
    ['prop-pine', 32, 323, 70, 116, 3],
    ['prop-pine', 79, 306, 50, 82, 3],
    ['prop-pine', 113, 296, 43, 70, 3],
    ['prop-pine', 290, 339, 70, 116, 3],
    ['prop-pine', 260, 313, 45, 75, 3],
    ['prop-pine', 245, 291, 45, 83, 3],
    ['prop-tree', 274, 304, 58, 76, 3],
    ['prop-pine', 647, 326, 57, 94, 3],
    ['prop-tree', 676, 342, 86, 108, 3],
    ['prop-pine', 708, 310, 49, 91, 3],
    ['prop-pine', 729, 323, 48, 100, 3],
    ['prop-pine', 941, 348, 73, 120, 3],
    ['prop-pine', 980, 330, 86, 142, 3],
    ['prop-pine', 861, 303, 44, 73, 3],
    ['prop-tree', 902, 326, 56, 68, 3],
    ['prop-pine', 6, 290, 64, 118, 3],
    ['prop-pine', 91, 343, 65, 108, 3],
    ['prop-tree', 47, 364, 76, 91, 3],
    ['prop-pine', 921, 317, 57, 105, 3],
    ['prop-pine', 893, 361, 67, 122, 3],
    ['prop-tree', 955, 375, 78, 93, 3],
    ['prop-tree', 318, 392, 84, 104, 3],
    ['prop-tree', 711, 372, 75, 95, 3],
    ['prop-hedge', 56, 522, 92, 66, 30],
    ['prop-hedge', 228, 526, 103, 73, 30],
    ['prop-hedge', 720, 528, 93, 67, 30],
    ['prop-hedge', 903, 532, 99, 71, 30],
    ['prop-pine', -15, 565, 105, 172, 30],
    ['prop-pine', 993, 572, 110, 180, 30],
    ['prop-pine', -75, 512, 118, 195, 28],
    ['prop-pine', -35, 470, 103, 170, 28],
    ['prop-tree', -40, 547, 121, 141, 29],
    ['prop-pine', 1021, 493, 114, 189, 28],
    ['prop-pine', 978, 478, 90, 147, 28],
    ['prop-tree', 1002, 543, 124, 146, 29],
    ['prop-hedge', 260, 469, 52, 35, 29],
    ['prop-hedge', 731, 473, 51, 34, 29],
    ['prop-bench', 353, 479, 77, 51, 30],
    ['prop-bench', 598, 482, 77, 51, 30],
    ['prop-fountain', 478, 474, 101, 99, 30],
    ['prop-lamp', 287, 401, 23, 78, 30],
    ['prop-lamp', 699, 397, 23, 78, 30],
    ['prop-lamp', 314, 490, 22, 75, 30],
    ['prop-lamp', 649, 489, 22, 75, 30],
    ['prop-lamp', 47, 491, 22, 75, 30],
    ['prop-lamp', 927, 496, 22, 75, 30],
  ];
  return rows.map(([id, x, y, width, height, depth]) => ({id, x, y, width, height, depth}));
}
