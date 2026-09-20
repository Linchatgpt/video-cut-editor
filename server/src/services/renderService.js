import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

export function renderClip({ sourcePath, clip, titleLayerPath, outputPath }) {
  return new Promise((resolve, reject) => {
    console.log('[ffmpeg] rendering reel', { sourcePath, outputPath, start: clip.start_time, end: clip.end_time });
    ffmpeg(sourcePath).seekInput(clip.start_time).duration(clip.end_time - clip.start_time).input(titleLayerPath)
      .complexFilter('[0:v]crop=ih*9/16:ih,scale=1080:1920[base];[base][1:v]overlay=0:0:format=auto[outv]')
      .outputOptions(['-map [outv]', '-map 0:a?', '-c:v libx264', '-c:a aac', '-pix_fmt yuv420p', '-shortest'])
      .on('end', resolve)
      .on('error', (error, stdout, stderr) => { console.error('[ffmpeg:error]', { message: error.message, stdout, stderr, outputPath }); reject(new Error(`FFmpeg 影片渲染失敗：${error.message}`)); })
      .save(outputPath);
  });
}

export function findUploadedVideo(uploadDirectory, fileId) {
  if (fileId === 'default') return path.join(uploadDirectory, 'default.mp4');
  const fileName = fs.readdirSync(uploadDirectory).find((name) => path.basename(name, path.extname(name)) === fileId);
  return fileName ? path.join(uploadDirectory, fileName) : null;
}
