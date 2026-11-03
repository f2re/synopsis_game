// Temporary type surface for the ADR-0007 renderer spike.
//
// three@0.187.0 does not publish TypeScript declarations. The canonical
// community package @types/three currently brings several unrelated helper
// dependencies. To keep the first visual spike dependency-minimal, this file
// types only the core symbols used by the POC. It MUST be deleted and replaced
// by maintained upstream/community declarations before the renderer becomes
// the production default.

declare module 'three' {
  class AnyThreeClass {
    [key: string]: any;
    constructor(...args: any[]);
  }

  export class AmbientLight extends AnyThreeClass {}
  export class BoxGeometry extends AnyThreeClass {}
  export class BufferAttribute extends AnyThreeClass {}
  export class BufferGeometry extends AnyThreeClass {}
  export class Color extends AnyThreeClass {}
  export class ConeGeometry extends AnyThreeClass {}
  export class CylinderGeometry extends AnyThreeClass {}
  export class DataTexture extends AnyThreeClass {}
  export class DepthTexture extends AnyThreeClass {}
  export class DirectionalLight extends AnyThreeClass {}
  export class FogExp2 extends AnyThreeClass {}
  export class Group extends AnyThreeClass {}
  export class Mesh<G = any, M = any> extends AnyThreeClass {}
  export class MeshBasicMaterial extends AnyThreeClass {}
  export class MeshNormalMaterial extends AnyThreeClass {}
  export class MeshToonMaterial extends AnyThreeClass {}
  export class Object3D extends AnyThreeClass {}
  export class OrthographicCamera extends AnyThreeClass {}
  export class Plane extends AnyThreeClass {}
  export class PlaneGeometry extends AnyThreeClass {}
  export class Points<G = any, M = any> extends AnyThreeClass {}
  export class PointsMaterial extends AnyThreeClass {}
  export class Raycaster extends AnyThreeClass {}
  export class Scene extends AnyThreeClass {}
  export class ShaderMaterial extends AnyThreeClass {}
  export class SphereGeometry extends AnyThreeClass {}
  export class Vector2 extends AnyThreeClass {}
  export class Vector3 extends AnyThreeClass {}
  export class WebGLRenderer extends AnyThreeClass {}
  export class WebGLRenderTarget extends AnyThreeClass {}

  export const NearestFilter: any;
  export const NoBlending: any;
  export const RGBAFormat: any;
  export const SRGBColorSpace: any;
  export const UnsignedByteType: any;
  export const UnsignedShortType: any;
}
