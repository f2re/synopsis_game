import test from 'node:test';
import assert from 'node:assert/strict';
import { worldBridge, codePostBridge } from './worldBridge.ts';

test('worldBridge dispatches teletype print event to phaser listener', () => {
  let receivedText = '';
  const unsub = worldBridge.on('codepost:print', (payload: any) => {
    receivedText = payload.text;
  });

  codePostBridge.printTeletype('10152 40102');
  assert.equal(receivedText, '10152 40102');
  unsub();
});

test('worldBridge dispatches stamp impact event', () => {
  let receivedStamp = '';
  const unsub = worldBridge.on('codepost:stamp', (payload: any) => {
    receivedStamp = payload.stamp;
  });

  codePostBridge.triggerStamp('ПРИНЯТО');
  assert.equal(receivedStamp, 'ПРИНЯТО');
  unsub();
});

test('worldBridge dispatches streak and triggers reactions', () => {
  let streakValue = 0;
  const unsub = worldBridge.on('codepost:streak', (payload: any) => {
    streakValue = payload.streak;
  });

  codePostBridge.updateStreak(5);
  assert.equal(streakValue, 5);
  unsub();
});

test('worldBridge dispatches study-calm mode toggle', () => {
  let calmState = false;
  const unsub = worldBridge.on('codepost:study_calm', (payload: any) => {
    calmState = payload.calm;
  });

  codePostBridge.setStudyCalm(true);
  assert.equal(calmState, true);
  unsub();
});
