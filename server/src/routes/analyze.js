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
    if (!fileId || !/^[a-f0-9-]+$/i.test(fileId)) return response.status(400).json({ error: '缺少有效的 fileId' });
    const videoPath = fs.readdirSync(uploadDirectory).find((name) => path.basename(name, path.extname(name)) === fileId);
    if (!videoPath) return response.status(404).json({ error: '找不到已上傳的影片' });
    const sourcePath = path.join(uploadDirectory, videoPath);
    const audioPath = path.join(tempDirectory, `${crypto.randomUUID()}.wav`);
    try {
      const duration = await getDuration(sourcePath);
      await extractAudio(sourcePath, audioPath);
      const transcript = await transcribeAudio(audioPath);
      const clips = validateHighlights(await chooseHighlights(transcript), duration);
      return response.json({ fileId, duration, transcript, clips });
    } catch (error) {
      return next(error);
    } finally {
      removeIfExists(audioPath);
    }
  };
}
