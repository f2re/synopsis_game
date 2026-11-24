import assert from 'node:assert/strict';
import test from 'node:test';
import { R09_ENTRANCES, r09Viewport, r09Pan, r09EntranceTargets, r09PhaseStyle, r09CloudOffset } from './r09SceneModel.ts';

test('the overview frames the entire painting below the HUD', () => {
  for (const [w, h] of [[1910,931],[1366,768],[390,844],[844,390],[320,568],[2560,1440]]) for (const dpr of [1,2]) {
    const v = r09Viewport(w*dpr,h*dpr,dpr,'overview');
    assert.equal(v.mode, 'overview');
    assert.deepEqual(v.visibleSourceBounds, [0,0,512,288]);
    assert.ok(Number.isInteger(v.offsetX * 8) && Number.isInteger(v.offsetY * 8));
    assert.ok(v.offsetX >= 0 && v.offsetX + 512 * v.zoom <= v.bufferWidth + .5);
    assert.ok(v.offsetY >= v.safeTop * dpr - .5 && v.offsetY + 288 * v.zoom <= v.bufferHeight - v.safeBottom * dpr + .5);
    const targets = r09EntranceTargets(v);
    if (w >= 390) assert.ok(targets.some(({ id }) => id === 'lab'));
    for (const [index, target] of targets.entries()) {
      assert.ok(targets.slice(index + 1).every((other) =>
        Math.abs(other.x - target.x) >= target.width || Math.abs(other.y - target.y) >= target.height));
    }
    assert.equal(v.canPanLeft || v.canPanRight, false);
  }
});
test('landscape starts in overview and portrait starts at a readable detail scale', () => {
  assert.equal(r09Viewport(1910,931).mode, 'overview');
  assert.equal(r09Viewport(1366,768).mode, 'overview');
  assert.equal(r09Viewport(844,390).mode, 'overview');
  assert.equal(r09Viewport(390,844).mode, 'detail');
});
test('detail covers every supported buffer on the native camera grid', () => {
  for (const [w, h] of [[1366,768],[390,844],[844,390],[320,568],[2560,1440]]) for (const dpr of [1,2]) {
    const v = r09Viewport(w*dpr,h*dpr,dpr,'detail');
    assert.ok(Number.isInteger(v.zoom)); assert.ok(Number.isInteger(v.offsetX)); assert.ok(Number.isInteger(v.offsetY));
    const [x,y,vw,vh]=v.visibleSourceBounds;
    const visibleTop=y+v.safeTop*dpr/v.zoom;
    const visibleBottom=y+vh-v.safeBottom*dpr/v.zoom;
    assert.ok(x>=-.5 && x+vw<=512.5 && visibleTop>=-.5 && visibleBottom<=288.5);
  }
});
test('all six real entrances remain reachable through the panorama at every viewport', () => {
  for (const [w,h] of [[1366,768],[390,844],[844,390],[320,568]]) for (const dpr of [1,2]) {
    const seen=new Set<string>(); let v=r09Viewport(w*dpr,h*dpr,dpr,'detail');
    for(let i=0;i<10 && v.canPanLeft;i++)v=r09Pan(v,'left');
    for(let i=0;i<16;i++) {
      for(const box of r09EntranceTargets(v)) {
        seen.add(box.id); assert.ok(box.width>=44 && box.height>=44);
        assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=w && box.y+box.height<=h);
      }
      if(!v.canPanRight)break; v=r09Pan(v,'right');
    }
    assert.deepEqual([...seen].sort(),R09_ENTRANCES.map(x=>x.id).sort(),`${w}x${h} DPR${dpr}`);
  }
});
test('panning is bounded, deterministic and does not alter authored entrances', () => {
  const initial=r09Viewport(780,1688,2,'detail'); let v=initial;
  for(let i=0;i<100;i++)v=r09Pan(v,'right');
  assert.equal(v.canPanRight,false); assert.deepEqual(v,r09Pan(v,'right'));
  assert.deepEqual(initial,r09Viewport(780,1688,2,'detail'));
  assert.equal(R09_ENTRANCES.find(x=>x.id==='archive')?.x,317);
});
test('local light hierarchy and clouds retain still pose and wrap outside the scene', () => {
  assert.ok(r09PhaseStyle('night',false).lights>r09PhaseStyle('day',false).lights);
  assert.equal(r09PhaseStyle('night',true).stars,0);
  assert.equal(r09CloudOffset(16000,354,31,true),0);
  assert.equal(r09CloudOffset(0,354,31,false),0);
  let lastX=354;
  for(let ms=0;ms<1_200_000;ms+=1000) {
    const x=354+r09CloudOffset(ms,354,31,false);
    assert.ok(Number.isInteger(x) && x>=-31 && x<512);
    if(x<lastX)assert.ok(lastX>=511 && x+31<=1, 'wrap is outside visible sky');
    lastX=x;
  }
});
