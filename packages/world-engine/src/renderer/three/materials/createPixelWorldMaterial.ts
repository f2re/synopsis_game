import * as THREE from 'three';

export interface PixelWorldMaterialOptions {
  color: number;
  lightBands?: 3 | 4;
  ambient?: number;
  lightDirection?: THREE.Vector3;
}

const vertexShader = /* glsl */ `
  varying vec3 vWorldNormal;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uBaseColor;
  uniform vec3 uLightDirection;
  uniform float uAmbient;
  uniform float uLightBands;
  varying vec3 vWorldNormal;

  float quantizeLight(float value, float bands) {
    float safeBands = max(bands, 2.0);
    return floor(clamp(value, 0.0, 0.9999) * safeBands) / (safeBands - 1.0);
  }

  void main() {
    float lambert = max(dot(normalize(vWorldNormal), normalize(uLightDirection)), 0.0);
    float lit = clamp(uAmbient + lambert * (1.0 - uAmbient), 0.0, 1.0);
    float stepped = quantizeLight(lit, uLightBands);
    gl_FragColor = vec4(uBaseColor * (0.48 + stepped * 0.52), 1.0);
  }
`;

export function createPixelWorldMaterial(options: PixelWorldMaterialOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uBaseColor: { value: new THREE.Color(options.color) },
      uLightDirection: {
        value: (options.lightDirection ?? new THREE.Vector3(-0.4, 0.8, 0.5)).clone().normalize(),
      },
      uAmbient: { value: options.ambient ?? 0.34 },
      uLightBands: { value: options.lightBands ?? 3 },
    },
  });
}
