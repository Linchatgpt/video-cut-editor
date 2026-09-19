import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const allowedMimeTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska']);
const allowedExtensions = new Set(['.mp4', '.mov', '.webm', '.mkv']);

export function createUploadRouter({ uploadDirectory }) {
  fs.mkdirSync(uploadDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
        const error = new Error('僅支援 MP4、MOV、WebM 或 MKV 影片');
        error.statusCode = 400;
        return callback(error);
      }
      return callback(null, true);
    },
  });

  return { upload, handleUpload(request, response) {
    if (!request.file) {
      return response.status(400).json({ error: '請選擇影片檔案後再上傳' });
    }

    return response.status(201).json({
      fileId: path.basename(request.file.filename, path.extname(request.file.filename)),
      originalName: request.file.originalname,
      path: request.file.path,
      size: request.file.size,
      mimeType: request.file.mimetype,
    });
  } };
}
