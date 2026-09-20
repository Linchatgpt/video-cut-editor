import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/errorHandler.js';

test('pipeline configuration errors are exposed as service errors', () => {
  let result;
  errorHandler(new Error('找不到 Whisper 指令「whisper」，請先安裝或設定 WHISPER_COMMAND'), {}, { status: (code) => ({ json: (body) => { result = { code, body }; } }) }, () => {});
  assert.deepEqual(result, { code: 503, body: { error: '找不到 Whisper 指令「whisper」，請先安裝或設定 WHISPER_COMMAND' } });
});
