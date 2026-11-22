import assert from 'node:assert/strict';
import test from 'node:test';
import { HUB_WORLD_DEFINITION_V1 } from './HubWorldDefinition.ts';
import { renderHubSpatialAuditSvg } from './HubSpatialAuditSvg.ts';

test('spatial diagnostic SVG has the accepted dimensions and actual path overlaps', () => {
  const svg = renderHubSpatialAuditSvg(HUB_WORLD_DEFINITION_V1);
  assert.match(svg, /viewBox="0 0 640 360"/);
  assert.match(svg, /water 92–147/);
  assert.match(svg, /path\/structure overlaps/);
  assert.match(svg, /NOT APPROVED COLLISION/);
  assert.match(svg, /plaza-spine/);
  assert.match(svg, /operations/);
  assert.equal((svg.match(/<polygon /g) ?? []).length, 9);
  assert.equal((svg.match(/<circle cx=/g) ?? []).length, 9);
});
