import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export async function transcribeAudio(audioPath, { command = process.env.WHISPER_COMMAND || 'whisper' } = {}) {
  const outputDirectory = path.dirname(audioPath);
  try {
    console.log('[whisper] transcribing audio', { audioPath, command });
    await execFileAsync(command, [audioPath, '--output_format', 'json', '--output_dir', outputDirectory], { timeout: 15 * 60 * 1000 });
    const jsonPath = path.join(outputDirectory, `${path.basename(audioPath, path.extname(audioPath))}.json`);
    const result = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const segments = (result.segments || []).map((segment) => ({ start: Number(segment.start), end: Number(segment.end), text: String(segment.text || '').trim() })).filter((segment) => segment.text && Number.isFinite(segment.start) && Number.isFinite(segment.end));
    if (!segments.length) throw new Error('Whisper 沒有產生有效逐字稿');
    return { segments };
  } catch (error) {
    console.error('[whisper:error]', { message: error.message, audioPath, command });
    if (error.code === 'ENOENT') throw new Error(`找不到 Whisper 指令「${command}」，請先安裝或設定 WHISPER_COMMAND`);
    throw new Error(`語音辨識失敗：${error.message}`);
  }
}
