import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import supertest from 'supertest';
import { createUploadRouter } from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(currentDirectory, '..');

export function createApp({ uploadDirectory = path.join(serverDirectory, 'uploads') } = {}) {
  const app = express();
  const uploadRouter = createUploadRouter({ uploadDirectory });

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'video-editor-api' });
  });

  app.post('/api/upload', uploadRouter.upload.single('video'), uploadRouter.handleUpload);
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

const app = createApp();
const port = Number(process.env.PORT || 8787);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`[server] Local API listening on http://localhost:${port}`);
  });
}
