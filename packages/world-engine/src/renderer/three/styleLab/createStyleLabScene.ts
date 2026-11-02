import * as THREE from 'three';
import { WORLD_PALETTE } from '../../../theme/tokens';
import { logicalGroundToWorld } from '../camera/orthographicMapping';
import { HUB_GEOMETRY_LOCK_V1, type HubRect2D } from '../geometryLock';
import { createPixelWorldMaterial } from '../materials/createPixelWorldMaterial';

function addGroundRect(
  group: THREE.Group,
  rect: HubRect2D,
  color: number,
  y = 0,
): THREE.Mesh {
  const center = logicalGroundToWorld({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const front = logicalGroundToWorld({ x: rect.x, y: rect.y });
  const back = logicalGroundToWorld({ x: rect.x, y: rect.y + rect.height });
  const depth = Math.abs(back.z - front.z);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(rect.width, 1.5, depth),
    createPixelWorldMaterial({ color }),
  );
  mesh.position.set(center.x, y, center.z);
  group.add(mesh);
  return mesh;
}

function addBuilding(group: THREE.Group): void {
  const lock = HUB_GEOMETRY_LOCK_V1.buildings.find((building) => building.id === 'codepost');
  if (!lock) throw new Error('Geometry Lock is missing codepost.');

  const footprint = lock.screenBounds;
  const center = logicalGroundToWorld({
    x: footprint.x + footprint.width / 2,
    y: footprint.y + footprint.height / 2,
  });
  const front = logicalGroundToWorld({ x: footprint.x, y: footprint.y });
  const back = logicalGroundToWorld({ x: footprint.x, y: footprint.y + footprint.height });
  const depth = Math.abs(back.z - front.z);
  const height = 58;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(footprint.width, height, depth),
    createPixelWorldMaterial({ color: WORLD_PALETTE.stoneConcrete3 }),
  );
  body.position.set(center.x, height / 2 + 1, center.z);
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(footprint.width + 8, 8, depth + 8),
    createPixelWorldMaterial({ color: WORLD_PALETTE.ochreTerracotta0 }),
  );
  roof.position.set(center.x, height + 5, center.z);
  group.add(roof);

  const entranceWorld = logicalGroundToWorld(lock.entrance);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(18, 27, 3),
    createPixelWorldMaterial({ color: WORLD_PALETTE.inkTelecode0 }),
  );
  door.position.set(entranceWorld.x, 14.5, entranceWorld.z - 2);
  group.add(door);
}

function addTree(group: THREE.Group): void {
  const base = logicalGroundToWorld({ x: 430, y: 228 });
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(9, 34, 9),
    createPixelWorldMaterial({ color: WORLD_PALETTE.ochreTerracotta0 }),
  );
  trunk.position.set(base.x, 17, base.z);
  group.add(trunk);

  const crownMaterial = createPixelWorldMaterial({ color: WORLD_PALETTE.foliagePine3 });
  const crownA = new THREE.Mesh(new THREE.IcosahedronGeometry(25, 0), crownMaterial);
  crownA.position.set(base.x - 8, 48, base.z);
  group.add(crownA);
  const crownB = new THREE.Mesh(new THREE.IcosahedronGeometry(22, 0), crownMaterial);
  crownB.position.set(base.x + 12, 54, base.z + 3);
  group.add(crownB);
}

function addCharacter(group: THREE.Group): void {
  const base = logicalGroundToWorld({ x: 332, y: 270 });
  const cloth = createPixelWorldMaterial({ color: WORLD_PALETTE.uiTeal3 });
  const skin = createPixelWorldMaterial({ color: WORLD_PALETTE.ochreTerracotta3 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(12, 20, 8), cloth);
  torso.position.set(base.x, 25, base.z);
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), skin);
  head.position.set(base.x, 41, base.z);
  group.add(head);

  for (const offset of [-3.5, 3.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 5), cloth);
    leg.position.set(base.x + offset, 8, base.z);
    group.add(leg);
  }
}

function addGeometryLockMarkers(group: THREE.Group): void {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: WORLD_PALETTE.checkingPencil0 });
  for (const building of HUB_GEOMETRY_LOCK_V1.buildings) {
    const entrance = logicalGroundToWorld(building.entrance);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 3), markerMaterial);
    marker.position.set(entrance.x, 6, entrance.z);
    group.add(marker);
  }
}

export function createStyleLabScene(debugGeometryLock = false): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hub-style-lab';

  addGroundRect(group, { x: 0, y: HUB_GEOMETRY_LOCK_V1.horizonY, width: 640, height: 360 - HUB_GEOMETRY_LOCK_V1.horizonY }, WORLD_PALETTE.foliagePine1, -2);
  addGroundRect(group, { x: 0, y: HUB_GEOMETRY_LOCK_V1.horizonY, width: 640, height: 26 }, WORLD_PALETTE.waterGulf2, 0);
  addGroundRect(group, { x: 245, y: 176, width: 54, height: 184 }, WORLD_PALETTE.stoneConcrete2, 1);

  addBuilding(group);
  addTree(group);
  addCharacter(group);
  if (debugGeometryLock) addGeometryLockMarkers(group);

  return group;
}
