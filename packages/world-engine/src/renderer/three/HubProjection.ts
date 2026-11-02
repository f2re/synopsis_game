import {
  OrthographicCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';

export interface HubProjectionOptions {
  logicalWidth: number;
  logicalHeight: number;
  cameraPosition?: readonly [number, number, number];
  cameraTarget?: readonly [number, number, number];
}

/**
 * Maps canonical Hub logical pixels onto the y=0 world plane.
 *
 * Because an orthographic camera maps a plane affinely, unprojecting the
 * canonical screen coordinate and intersecting y=0 guarantees that a ground
 * anchor projects back to exactly the same logical (x, y) coordinate. This is
 * the core Geometry Lock invariant for the 2.5D renderer.
 */
export class HubProjection {
  readonly camera: OrthographicCamera;

  private readonly logicalWidth: number;
  private readonly logicalHeight: number;
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();

  constructor(options: HubProjectionOptions) {
    this.logicalWidth = options.logicalWidth;
    this.logicalHeight = options.logicalHeight;

    this.camera = new OrthographicCamera(
      -this.logicalWidth / 2,
      this.logicalWidth / 2,
      this.logicalHeight / 2,
      -this.logicalHeight / 2,
      0.1,
      2400,
    );

    const position = options.cameraPosition ?? [0, 430, 560];
    const target = options.cameraTarget ?? [0, 0, 0];
    this.camera.position.set(...position);
    this.camera.lookAt(...target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  logicalToNdc(x: number, y: number, target = new Vector2()): Vector2 {
    target.set((x / this.logicalWidth) * 2 - 1, 1 - (y / this.logicalHeight) * 2);
    return target;
  }

  logicalToGround(x: number, y: number, target = new Vector3()): Vector3 {
    this.logicalToNdc(x, y, this.ndc);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
    if (!hit) {
      throw new Error(`HubProjection: logical point (${x}, ${y}) does not intersect ground plane`);
    }
    return hit;
  }

  groundToLogical(point: Vector3, target = new Vector2()): Vector2 {
    const projected = point.clone().project(this.camera);
    target.set(
      ((projected.x + 1) / 2) * this.logicalWidth,
      ((1 - projected.y) / 2) * this.logicalHeight,
    );
    return target;
  }

  rayFromLogical(x: number, y: number): Raycaster {
    this.logicalToNdc(x, y, this.ndc);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster;
  }
}
