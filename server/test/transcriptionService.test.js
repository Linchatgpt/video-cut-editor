import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTranscript } from '../src/services/transcriptionService.js';

test('normalizes whisper-cli transcription output', () => {
  const result = normalizeTranscript({ transcription: [{ offsets: { from: 1200, to: 3450 }, text: ' hello ' }] });
  assert.deepEqual(result, [{ start: 1.2, end: 3.45, text: 'hello' }]);
});
