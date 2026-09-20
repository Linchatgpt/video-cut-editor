import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { renderTitleCard } from '../services/titleCardService.js';
import { findUploadedVideo, renderClip } from '../services/renderService.js';
import { getVideoDimensions } from '../services/ffmpegService.js';

export function createRenderRouter({ uploadDirectory, tempDirectory, outputDirectory }) {
  [tempDirectory, outputDirectory].forEach((directory) => fs.mkdirSync(directory, { recursive: true }));
  return async function render(request, response, next) {
    const { fileId, clips, style } = request.body || {};
    const sourcePath = findUploadedVideo(uploadDirectory, fileId);
    if (!sourcePath || !Array.isArray(clips) || !clips.length) return response.status(400).json({ error: '缺少有效的影片或片段資料' });
    try {
      const originalDimensions = await getVideoDimensions(sourcePath);
      const outputs = [];
      for (const clip of clips) {
        const safeId = String(clip.id || crypto.randomUUID()).replace(/[^a-z0-9_-]/gi, '-');
        const layerPath = path.join(tempDirectory, `${safeId}-title.png`);
        const outputPath = path.join(outputDirectory, `${safeId}-${crypto.randomUUID()}.mp4`);
        await renderTitleCard({ title: clip.top_text ?? clip.title, caption: clip.caption ?? clip.bottom_text, outputPath: layerPath, style: clip.style || style, outputAspect: clip.outputAspect, originalDimensions });
        await renderClip({ sourcePath, clip, titleLayerPath: layerPath, outputPath, originalDimensions });
        outputs.push({ id: clip.id, previewUrl: `/api/output/${path.basename(outputPath)}`, downloadUrl: `/api/download/${path.basename(outputPath)}` });
      }
      return response.json({ outputs });
    } catch (error) { return next(error); }
  };
}
