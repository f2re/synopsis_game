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

function createGableRoofGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const positions = new Float32Array([
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    0, height, halfDepth,
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    0, height, -halfDepth,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 1, 2,
    3, 5, 4,
    0, 2, 5,
    0, 5, 3,
    1, 4, 5,
    1, 5, 2,
    0, 3, 4,
    0, 4, 1,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Deliberately non-authoritative Style Lab fixture.
 *
 * This building is sized as a visual probe in world units. It does NOT derive a
 * physical footprint from legacy screen-space building bounds. Geometry Lock is
 * used only for camera/horizon/debug alignment until R3 introduces canonical
 * renderer-independent HubWorldDefinition footprints.
 */
function addFixtureBuilding(group: THREE.Group): void {
  const ground = logicalGroundToWorld({ x: 310, y: 226 });
  const width = 112;
  const depth = 64;
  const bodyHeight = 52;
  const frontZ = ground.z + depth / 2;

  const wallMaterial = createPixelWorldMaterial({ color: WORLD_PALETTE.stoneConcrete3 });
  const roofMaterial = createPixelWorldMaterial({ color: WORLD_PALETTE.ochreTerracotta0 });
  const darkMaterial = createPixelWorldMaterial({ color: WORLD_PALETTE.inkTelecode0 });
  const glassMaterial = createPixelWorldMaterial({ color: WORLD_PALETTE.waterGulf3, lightBands: 3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), wallMaterial);
  body.position.set(ground.x, bodyHeight / 2 + 1, ground.z);
  group.add(body);

  const roof = new THREE.Mesh(createGableRoofGeometry(width + 10, depth + 10, 20), roofMaterial);
  roof.position.set(ground.x, bodyHeight + 1, ground.z);
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(18, 28, 3), darkMaterial);
  door.position.set(ground.x, 15, frontZ + 2);
  group.add(door);

  for (const offset of [-31, 31]) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 3), glassMaterial);
    windowMesh.position.set(ground.x + offset, 32, frontZ + 2);
    group.add(windowMesh);
  }

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(10, 22, 10), darkMaterial);
  chimney.position.set(ground.x + 34, bodyHeight + 17, ground.z - 8);
  group.add(chimney);
}

function addTree(group: THREE.Group): void {
  const base = logicalGroundToWorld({ x: 445, y: 238 });
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
  const base = logicalGroundToWorld({ x: 372, y: 284 });
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

  addGroundRect(
    group,
    { x: 0, y: HUB_GEOMETRY_LOCK_V1.horizonY, width: 640, height: 360 - HUB_GEOMETRY_LOCK_V1.horizonY },
    WORLD_PALETTE.foliagePine1,
    -2,
  );
  addGroundRect(
    group,
    { x: 0, y: HUB_GEOMETRY_LOCK_V1.horizonY, width: 640, height: 24 },
    WORLD_PALETTE.waterGulf2,
    0,
  );
  addGroundRect(group, { x: 280, y: 204, width: 40, height: 156 }, WORLD_PALETTE.stoneConcrete2, 1);

  addFixtureBuilding(group);
  addTree(group);
  addCharacter(group);
  if (debugGeometryLock) addGeometryLockMarkers(group);

  return group;
}
