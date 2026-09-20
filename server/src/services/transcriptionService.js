import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const defaultModel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../models/ggml-base.bin');

export function normalizeTranscript(result) {
  const source = result.segments || result.transcription || [];
  return source.map((segment) => {
    const start = Number.isFinite(Number(segment.start)) ? Number(segment.start) : Number(segment.offsets?.from || 0) / 1000;
    const end = Number.isFinite(Number(segment.end)) ? Number(segment.end) : Number(segment.offsets?.to || 0) / 1000;
    return { start, end, text: String(segment.text || '').trim() };
  }).filter((segment) => segment.text && Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start);
}

export async function transcribeAudio(audioPath, { command = process.env.WHISPER_COMMAND || 'whisper-cli', modelPath = process.env.WHISPER_MODEL || defaultModel } = {}) {
  const outputDirectory = path.dirname(audioPath);
  const outputPrefix = path.join(outputDirectory, path.basename(audioPath, path.extname(audioPath)));
  try {
    console.log('[whisper] transcribing audio', { audioPath, command, modelPath });
    await execFileAsync(command, ['-m', modelPath, '-oj', '-of', outputPrefix, '-l', 'auto', '--no-prints', audioPath], { timeout: 15 * 60 * 1000 });
    const jsonPath = `${outputPrefix}.json`;
    const result = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const segments = normalizeTranscript(result);
    if (!segments.length) throw new Error('Whisper 沒有產生有效逐字稿');
    return { segments };
  } catch (error) {
    console.error('[whisper:error]', { message: error.message, audioPath, command, modelPath });
    if (error.code === 'ENOENT') throw new Error(`找不到 Whisper 指令「${command}」，請先安裝或設定 WHISPER_COMMAND`);
    throw new Error(`語音辨識失敗：${error.message}`);
  }
}
