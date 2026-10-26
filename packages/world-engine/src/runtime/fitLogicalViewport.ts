import Phaser from 'phaser';

export const WORLD_LOGICAL_WIDTH = 480;
export const WORLD_LOGICAL_HEIGHT = 270;

export function fitLogicalViewport(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  const viewportWidth = Math.max(scene.scale.width, 1);
  const viewportHeight = Math.max(scene.scale.height, 1);
  const zoom = Math.max(
    viewportWidth / WORLD_LOGICAL_WIDTH,
    viewportHeight / WORLD_LOGICAL_HEIGHT,
  );

  camera.setViewport(0, 0, viewportWidth, viewportHeight);
  camera.setZoom(zoom);
  camera.centerOn(WORLD_LOGICAL_WIDTH / 2, WORLD_LOGICAL_HEIGHT / 2);
}

export function bindLogicalViewport(scene: Phaser.Scene): void {
  const resize = () => fitLogicalViewport(scene);

  fitLogicalViewport(scene);
  scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, resize);
  });
}
