import test from 'node:test';
import assert from 'node:assert/strict';
import { getCropFilter } from '../src/services/renderService.js';

test('crop position changes the horizontal crop origin for a landscape vertical export', () => {
  const left = getCropFilter('9:16', { width: 1920, height: 1080 }, { x: 0, y: 50 });
  const right = getCropFilter('9:16', { width: 1920, height: 1080 }, { x: 100, y: 50 });

  assert.equal(left, 'crop=608:1080:0:0');
  assert.equal(right, 'crop=608:1080:1312:0');
});

test('crop position changes the vertical crop origin for a portrait square export', () => {
  assert.equal(getCropFilter('1:1', { width: 1080, height: 1920 }, { x: 50, y: 0 }), 'crop=1080:1080:0:0');
  assert.equal(getCropFilter('1:1', { width: 1080, height: 1920 }, { x: 50, y: 100 }), 'crop=1080:1080:0:840');
});
