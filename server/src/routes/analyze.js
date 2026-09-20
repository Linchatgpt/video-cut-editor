import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { extractAudio, getDuration, removeIfExists } from '../services/ffmpegService.js';
import { transcribeAudio } from '../services/transcriptionService.js';
import { chooseHighlights, validateHighlights } from '../services/geminiService.js';

export function createAnalyzeRouter({ uploadDirectory, tempDirectory }) {
  fs.mkdirSync(tempDirectory, { recursive: true });
  return async function analyze(request, response, next) {
    const { fileId } = request.body || {};
    const clipCount = Math.min(5, Math.max(1, Number(request.body?.clipCount || 3)));
    const clipDuration = Math.min(60, Math.max(10, Number(request.body?.clipDuration || 15)));
    if (!fileId || (fileId !== 'default' && !/^[a-f0-9-]+$/i.test(fileId))) return response.status(400).json({ error: '缺少有效的 fileId' });
    const videoPath = fileId === 'default'
      ? 'default.mp4'
      : fs.readdirSync(uploadDirectory).find((name) => path.basename(name, path.extname(name)) === fileId);
    if (!videoPath) return response.status(404).json({ error: '找不到已上傳的影片' });
    const sourcePath = path.join(uploadDirectory, videoPath);
    const audioPath = path.join(tempDirectory, `${crypto.randomUUID()}.wav`);
    try {
      const duration = await getDuration(sourcePath);
      await extractAudio(sourcePath, audioPath);
      const transcript = await transcribeAudio(audioPath);
      const clips = validateHighlights(await chooseHighlights(transcript, { clipCount, clipDuration }), duration, { clipCount, clipDuration });
      return response.json({ fileId, duration, transcript, clips });
    } catch (error) {
      return next(error);
    } finally {
      removeIfExists(audioPath);
    }
  };
}
