import * as THREE from 'three';
import { HUB_CAMERA_TILT_RADIANS } from './orthographicMapping';

export function createHubOrthographicCamera(): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(-320, 320, 180, -180, 1, 3000);
  const distance = 1000;

  camera.up.set(0, Math.cos(HUB_CAMERA_TILT_RADIANS), -Math.sin(HUB_CAMERA_TILT_RADIANS));
  camera.position.set(
    0,
    Math.sin(HUB_CAMERA_TILT_RADIANS) * distance,
    Math.cos(HUB_CAMERA_TILT_RADIANS) * distance,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return camera;
}
