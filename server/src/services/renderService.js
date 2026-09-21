import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

export function getCropFilter(outputAspect, originalDimensions, position = { x: 50, y: 50 }) {
  if (outputAspect === 'original' || !originalDimensions?.width || !originalDimensions?.height) return 'null';
  const sourceWidth = Number(originalDimensions.width);
  const sourceHeight = Number(originalDimensions.height);
  const targetRatio = outputAspect === '1:1' ? 1 : 9 / 16;
  const sourceRatio = sourceWidth / sourceHeight;
  const cropWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
  const cropHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
  const x = (sourceWidth - cropWidth) * Math.min(100, Math.max(0, Number(position.x ?? 50))) / 100;
  const y = (sourceHeight - cropHeight) * Math.min(100, Math.max(0, Number(position.y ?? 50))) / 100;
  return `crop=${Math.round(cropWidth)}:${Math.round(cropHeight)}:${Math.floor(x)}:${Math.floor(y)}`;
}

export function renderClip({ sourcePath, clip, titleLayerPath, bottomLayerPath, outputPath, originalDimensions, musicPath = null }) {
  return new Promise((resolve, reject) => {
    const square = clip.outputAspect === '1:1';
    const original = clip.outputAspect === 'original';
    const crop = original ? 'null' : getCropFilter(clip.outputAspect, originalDimensions, clip.cropPosition);
    const size = original ? '1080:-2' : square ? '1080:1080' : '1080:1920';
    console.log('[ffmpeg] rendering reel', { sourcePath, outputPath, start: clip.start_time, end: clip.end_time, outputAspect: square ? '1:1' : '9:16' });
    const command = ffmpeg(sourcePath).seekInput(clip.start_time).duration(clip.end_time - clip.start_time).input(titleLayerPath).input(bottomLayerPath);
    if (musicPath) command.input(musicPath).inputOptions(['-stream_loop', '-1']);
    const top = clip.style?.topText || {}; const bottom = clip.style?.bottomText || {};
    const topStart = Math.max(0, Number(top.showFrom || 0)); const topEnd = Math.max(topStart, Number(top.hideAt >= 9999 ? clip.end_time - clip.start_time : top.hideAt));
    const bottomStart = Math.max(0, Number(bottom.showFrom || 0)); const bottomEnd = Math.max(bottomStart, Number(bottom.hideAt >= 9999 ? clip.end_time - clip.start_time : bottom.hideAt));
    const originalVolume = Math.min(1, Math.max(0, Number(clip.originalVolume ?? (clip.keepOriginalAudio === false ? 0 : 1))));
    const musicVolume = Math.min(1, Math.max(0, Number(clip.musicVolume ?? 0.35)));
    const audio = musicPath && originalVolume > 0
      ? `[0:a]volume=${originalVolume}[original];[3:a]volume=${musicVolume}[music];[original][music]amix=inputs=2:duration=first:weights=1+1[aout]`
      : musicPath
        ? `[3:a]volume=${musicVolume}[aout]`
        : `[0:a]volume=${originalVolume}[aout]`;
    command.complexFilter(`[0:v]${crop},scale=${size}[base];[base][1:v]overlay=0:0:format=auto:enable='between(t,${topStart},${topEnd})'[withtop];[withtop][2:v]overlay=0:0:format=auto:enable='between(t,${bottomStart},${bottomEnd})'[outv];${audio}`)
      .outputOptions(['-y', '-map [outv]', '-map [aout]', '-c:v libx264', '-c:a aac', '-pix_fmt yuv420p', '-shortest'])
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
