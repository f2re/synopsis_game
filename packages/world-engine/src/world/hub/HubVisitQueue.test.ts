import assert from 'node:assert/strict';
import test from 'node:test';
import { HubVisitQueue } from './HubVisitQueue.ts';

test('legacy and canonical Hub interactions remain immediate', () => {
  const queue = new HubVisitQueue();
  assert.equal(queue.request('archive', 'moving', false), 'archive');
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('collision-review dossier is deferred until arrival, exactly once', () => {
  const queue = new HubVisitQueue();
  assert.equal(queue.request('archive', 'moving', true), undefined);
  assert.equal(queue.onMovementUpdate(true), undefined);
  assert.equal(queue.onMovementUpdate(true), undefined);
  assert.equal(queue.onMovementUpdate(false), 'archive');
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('new clicks supersede stale pending building arrivals', () => {
  const queue = new HubVisitQueue();
  queue.request('archive', 'moving', true);
  queue.request('lab', 'moving', true);
  assert.equal(queue.onMovementUpdate(false), 'lab');
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('blocked destinations cancel pending visits without phantom dossier opening', () => {
  const queue = new HubVisitQueue();
  queue.request('archive', 'moving', true);
  assert.equal(queue.request('lab', 'unreachable', true), undefined);
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('already-arrived or reduced-motion visits open synchronously', () => {
  const queue = new HubVisitQueue();
  assert.equal(queue.request('canteen', 'arrived', true), 'canteen');
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('external navigation and scene teardown revoke a pending visit', () => {
  const queue = new HubVisitQueue();
  queue.request('radar', 'moving', true);
  queue.cancel();
  assert.equal(queue.onMovementUpdate(false), undefined);
});

test('unknown interaction status preserves existing immediate semantic clicks', () => {
  const queue = new HubVisitQueue();
  assert.equal(queue.request('operations', undefined, true), 'operations');
  assert.equal(queue.onMovementUpdate(false), undefined);
});
