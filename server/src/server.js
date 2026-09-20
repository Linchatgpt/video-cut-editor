import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import supertest from 'supertest';
import { createUploadRouter } from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAnalyzeRouter } from './routes/analyze.js';
import { createRenderRouter } from './routes/render.js';
import { getVideoDimensions } from './services/ffmpegService.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(currentDirectory, '..');

export function createApp({ uploadDirectory = path.join(serverDirectory, 'uploads'), tempDirectory = path.join(serverDirectory, 'temp'), outputDirectory = path.join(serverDirectory, 'outputs') } = {}) {
  const app = express();
  const uploadRouter = createUploadRouter({ uploadDirectory });

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'video-editor-api' });
  });

  app.get('/api/default-video', async (_request, response, next) => {
    const defaultPath = path.join(uploadDirectory, 'default.mp4');
    if (!requireFile(defaultPath)) return response.status(404).json({ error: '尚未設定預設影片' });
    try { return response.json({ fileId: 'default', originalName: '鈴木一朗「我的夢想」中文字幕.mp4', videoUrl: '/api/video/default', dimensions: await getVideoDimensions(defaultPath) }); } catch (error) { return next(error); }
  });

  app.get('/api/video/default', (_request, response) => {
    const defaultPath = path.join(uploadDirectory, 'default.mp4');
    if (!requireFile(defaultPath)) return response.status(404).json({ error: '尚未設定預設影片' });
    return response.sendFile(defaultPath);
  });

  app.post('/api/upload', uploadRouter.upload.single('video'), async (request, response, next) => { try { const result = uploadRouter.handleUpload(request, response); if (result?.then) await result; } catch (error) { next(error); } });
  app.post('/api/analyze', createAnalyzeRouter({ uploadDirectory, tempDirectory }));
  app.post('/api/render', createRenderRouter({ uploadDirectory, tempDirectory, outputDirectory }));
  app.get('/api/download/:fileName', (request, response) => {
    const fileName = path.basename(request.params.fileName);
    const outputPath = path.join(outputDirectory, fileName);
    if (!fs.existsSync(outputPath)) return response.status(404).json({ error: '找不到輸出影片' });
    return response.download(outputPath);
  });
  app.use(errorHandler);

  app.inject = (options) => {
    const request = supertest(app);
    const method = String(options.method || 'GET').toLowerCase();
    if (typeof request[method] !== 'function') {
      throw new Error(`Unsupported test method: ${options.method}`);
    }
    return request[method](options.url);
  };
  return app;
}

function requireFile(filePath) {
  return fs.existsSync(filePath);
}

const app = createApp();
const port = Number(process.env.PORT || 8787);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`[server] Local API listening on http://localhost:${port}`);
  });
}
