import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

test('analyze endpoint accepts the local default video id', async () => {
  const app = createApp();
  const response = await app.inject({ method: 'POST', url: '/api/analyze' }).send({ fileId: 'default' });
  assert.notEqual(response.statusCode, 400);
  assert.notEqual(response.body?.error, '缺少有效的 fileId');
});
