import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

test('health endpoint reports the local API service', async () => {
  const app = createApp();
  const response = await app.inject({ method: 'GET', url: '/api/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true, service: 'video-editor-api' });
});

test('upload route rejects requests without a video file', async () => {
  const app = createApp();
  const response = await app.inject({ method: 'POST', url: '/api/upload' });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, '請選擇影片檔案後再上傳');
});
