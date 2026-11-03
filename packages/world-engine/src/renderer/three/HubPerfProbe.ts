export interface HubPerfDistribution {
  mean: number;
  p50: number;
  p95: number;
  max: number;
}

export interface HubPerfSnapshot {
  renderer: 'three2d';
  samples: number;
  renderMs: HubPerfDistribution;
  frameDeltaMs: HubPerfDistribution;
  drawCalls: HubPerfDistribution;
  triangles: HubPerfDistribution;
  webglResources: {
    buffers: number;
    textures: number;
    programs: number;
    framebuffers: number;
    vertexArrays: number;
  };
  internalResolution: { width: 320; height: 180 };
  timestamp: string;
}

interface ContextCounters {
  drawCalls: number;
  triangles: number;
  buffers: number;
  textures: number;
  programs: number;
  framebuffers: number;
  vertexArrays: number;
}

interface FrameSample {
  renderMs: number;
  frameDeltaMs: number;
  drawCalls: number;
  triangles: number;
}

const TARGET_CLASS = 'hub-three2d-canvas';
const WINDOW_SIZE = 240;
const PUBLISH_EVERY = 30;
const contextCounters = new WeakMap<object, ContextCounters>();
let instrumentationInstalled = false;

function createCounters(): ContextCounters {
  return {
    drawCalls: 0,
    triangles: 0,
    buffers: 0,
    textures: 0,
    programs: 0,
    framebuffers: 0,
    vertexArrays: 0,
  };
}

function countersFor(context: object): ContextCounters {
  let counters = contextCounters.get(context);
  if (!counters) {
    counters = createCounters();
    contextCounters.set(context, counters);
  }
  return counters;
}

function isTargetContext(context: any): boolean {
  return context?.canvas?.classList?.contains?.(TARGET_CLASS) === true;
}

function trianglesForMode(context: any, mode: number, count: number): number {
  if (mode === context.TRIANGLES) return Math.floor(count / 3);
  if (mode === context.TRIANGLE_STRIP || mode === context.TRIANGLE_FAN) return Math.max(0, count - 2);
  return 0;
}

function wrapMethod(
  prototype: any,
  name: string,
  before: (context: any, args: any[]) => void,
): void {
  const original = prototype?.[name];
  if (typeof original !== 'function' || original.__hubPerfWrapped === true) return;

  const wrapped = function (this: any, ...args: any[]) {
    if (isTargetContext(this)) before(this, args);
    return original.apply(this, args);
  };
  wrapped.__hubPerfWrapped = true;
  prototype[name] = wrapped;
}

function wrapDrawMethods(prototype: any): void {
  wrapMethod(prototype, 'drawArrays', (context, args) => {
    const counters = countersFor(context);
    counters.drawCalls += 1;
    counters.triangles += trianglesForMode(context, Number(args[0]), Number(args[2]));
  });
  wrapMethod(prototype, 'drawElements', (context, args) => {
    const counters = countersFor(context);
    counters.drawCalls += 1;
    counters.triangles += trianglesForMode(context, Number(args[0]), Number(args[1]));
  });
  wrapMethod(prototype, 'drawArraysInstanced', (context, args) => {
    const counters = countersFor(context);
    const instances = Math.max(0, Number(args[3]) || 0);
    counters.drawCalls += 1;
    counters.triangles += trianglesForMode(context, Number(args[0]), Number(args[2])) * instances;
  });
  wrapMethod(prototype, 'drawElementsInstanced', (context, args) => {
    const counters = countersFor(context);
    const instances = Math.max(0, Number(args[4]) || 0);
    counters.drawCalls += 1;
    counters.triangles += trianglesForMode(context, Number(args[0]), Number(args[1])) * instances;
  });
}

function wrapResourcePair(
  prototype: any,
  createName: string,
  deleteName: string,
  key: keyof Pick<ContextCounters, 'buffers' | 'textures' | 'programs' | 'framebuffers' | 'vertexArrays'>,
): void {
  wrapMethod(prototype, createName, (context) => {
    const counters = countersFor(context);
    counters[key] += 1;
  });
  wrapMethod(prototype, deleteName, (context) => {
    const counters = countersFor(context);
    counters[key] = Math.max(0, counters[key] - 1);
  });
}

function installInstrumentation(): void {
  if (instrumentationInstalled || typeof window === 'undefined') return;
  instrumentationInstalled = true;

  const prototypes = [
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ].filter(Boolean);

  for (const prototype of prototypes) {
    wrapDrawMethods(prototype);
    wrapResourcePair(prototype, 'createBuffer', 'deleteBuffer', 'buffers');
    wrapResourcePair(prototype, 'createTexture', 'deleteTexture', 'textures');
    wrapResourcePair(prototype, 'createProgram', 'deleteProgram', 'programs');
    wrapResourcePair(prototype, 'createFramebuffer', 'deleteFramebuffer', 'framebuffers');
    wrapResourcePair(prototype, 'createVertexArray', 'deleteVertexArray', 'vertexArrays');
  }
}

function distribution(values: readonly number[]): HubPerfDistribution {
  if (values.length === 0) return { mean: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    mean: Number(mean.toFixed(2)),
    p50: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

function publishSnapshot(snapshot: HubPerfSnapshot): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { __SYNOPSIS_HUB_PERF__?: HubPerfSnapshot }).__SYNOPSIS_HUB_PERF__ = snapshot;
  window.dispatchEvent(new CustomEvent('hub:perf-snapshot', { detail: snapshot }));
}

/**
 * Opt-in diagnostic probe for real-device performance acceptance.
 *
 * Enable with `?hubRenderer=three2d&hubPerf=1`, exercise the Hub for at least
 * several seconds, then read `window.__SYNOPSIS_HUB_PERF__` in DevTools. The
 * probe measures CPU wall time around ThreeHubRenderer.update(), Phaser frame
 * deltas, WebGL draw calls/estimated triangles and live WebGL resource counts.
 * It deliberately does not claim GPU time: that requires device-specific GPU
 * tooling and remains part of the independent performance gate.
 */
export class HubPerfProbe {
  private readonly samples: FrameSample[] = [];
  private startedAt = 0;
  private currentDeltaMs = 0;
  private context?: WebGLRenderingContext | WebGL2RenderingContext;
  private drawCallsAtStart = 0;
  private trianglesAtStart = 0;
  private overlay?: HTMLPreElement;

  constructor() {
    installInstrumentation();
    this.createOverlay();
  }

  beginFrame(frameDeltaMs: number): void {
    this.context = this.findContext();
    const counters = this.context ? countersFor(this.context) : createCounters();
    this.drawCallsAtStart = counters.drawCalls;
    this.trianglesAtStart = counters.triangles;
    this.currentDeltaMs = frameDeltaMs;
    this.startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  endFrame(): void {
    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const counters = this.context ? countersFor(this.context) : createCounters();
    this.samples.push({
      renderMs: Math.max(0, finishedAt - this.startedAt),
      frameDeltaMs: this.currentDeltaMs,
      drawCalls: Math.max(0, counters.drawCalls - this.drawCallsAtStart),
      triangles: Math.max(0, counters.triangles - this.trianglesAtStart),
    });
    if (this.samples.length > WINDOW_SIZE) this.samples.shift();
    if (this.samples.length % PUBLISH_EVERY === 0) this.publish(counters);
  }

  private findContext(): WebGLRenderingContext | WebGL2RenderingContext | undefined {
    if (this.context) return this.context;
    const canvas = document.querySelector<HTMLCanvasElement>(`.${TARGET_CLASS}`);
    if (!canvas) return undefined;
    return (
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      undefined
    );
  }

  private publish(counters: ContextCounters): void {
    const snapshot: HubPerfSnapshot = {
      renderer: 'three2d',
      samples: this.samples.length,
      renderMs: distribution(this.samples.map((sample) => sample.renderMs)),
      frameDeltaMs: distribution(this.samples.map((sample) => sample.frameDeltaMs)),
      drawCalls: distribution(this.samples.map((sample) => sample.drawCalls)),
      triangles: distribution(this.samples.map((sample) => sample.triangles)),
      webglResources: {
        buffers: counters.buffers,
        textures: counters.textures,
        programs: counters.programs,
        framebuffers: counters.framebuffers,
        vertexArrays: counters.vertexArrays,
      },
      internalResolution: { width: 320, height: 180 },
      timestamp: new Date().toISOString(),
    };
    publishSnapshot(snapshot);
    if (this.overlay) {
      this.overlay.textContent = [
        'HUB 2.5D PERF',
        `render p50/p95/max: ${snapshot.renderMs.p50}/${snapshot.renderMs.p95}/${snapshot.renderMs.max} ms`,
        `frame  p50/p95/max: ${snapshot.frameDeltaMs.p50}/${snapshot.frameDeltaMs.p95}/${snapshot.frameDeltaMs.max} ms`,
        `draws  p50/p95/max: ${snapshot.drawCalls.p50}/${snapshot.drawCalls.p95}/${snapshot.drawCalls.max}`,
        `tris   p50/p95/max: ${snapshot.triangles.p50}/${snapshot.triangles.p95}/${snapshot.triangles.max}`,
        `GL buffers/textures/programs: ${snapshot.webglResources.buffers}/${snapshot.webglResources.textures}/${snapshot.webglResources.programs}`,
      ].join('\n');
    }
  }

  private createOverlay(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('pre');
    overlay.dataset.hubPerf = 'true';
    overlay.style.position = 'fixed';
    overlay.style.left = '8px';
    overlay.style.top = '8px';
    overlay.style.zIndex = '10000';
    overlay.style.margin = '0';
    overlay.style.padding = '6px 8px';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = 'rgba(5, 13, 24, 0.88)';
    overlay.style.color = '#e9e4d6';
    overlay.style.border = '1px solid #367c8b';
    overlay.style.font = '10px/1.35 monospace';
    overlay.textContent = 'HUB 2.5D PERF\ncollecting samples…';
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  destroy(): void {
    this.overlay?.remove();
    this.overlay = undefined;
    this.context = undefined;
  }
}
