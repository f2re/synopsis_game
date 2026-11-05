import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHubCoverGeometry} from './hubCoverGeometry.ts';
test('16:9 fills viewport without cropping',()=>{const g=calculateHubCoverGeometry(1920,1080);assert.equal(g.zoom,4);assert.equal(g.cropX,0);assert.equal(g.cropY,0)});
test('16:10 fills viewport with symmetric horizontal cropping',()=>{const g=calculateHubCoverGeometry(1440,900);assert.ok(g.cropX>0);assert.equal(g.cropY,0);assert.equal(g.zoom,900/270)});
test('portrait reveals UX limitation requiring alternative navigation',()=>{const g=calculateHubCoverGeometry(390,844);assert.ok(g.visibleWidth<150);assert.ok(g.cropX>150)});
test('invalid dimensions cannot produce invalid camera state',()=>{for(const n of [0,-1,NaN,Infinity])assert.throws(()=>calculateHubCoverGeometry(n,900),RangeError)});
