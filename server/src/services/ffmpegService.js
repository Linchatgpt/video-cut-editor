import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';

export function extractAudio(videoPath, wavPath) {
  return new Promise((resolve, reject) => {
    console.log('[ffmpeg] extracting audio', { videoPath, wavPath });
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .on('end', resolve)
      .on('error', (error, stdout, stderr) => {
        console.error('[ffmpeg:error]', { message: error.message, stdout, stderr, videoPath, wavPath });
        reject(new Error(`FFmpeg 音訊抽取失敗：${error.message}`));
      })
      .save(wavPath);
  });
}

export function getDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) return reject(new Error(`無法讀取影片長度：${error.message}`));
      resolve(Number(metadata.format.duration || 0));
    });
  });
}

export function getVideoDimensions(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) return reject(new Error(`無法讀取影片尺寸：${error.message}`));
      const stream = (metadata.streams || []).find((item) => item.codec_type === 'video');
      if (!stream?.width || !stream?.height) return reject(new Error('找不到影片原始尺寸')); 
      resolve({ width: Number(stream.width), height: Number(stream.height) });
    });
  });
}

export function removeIfExists(filePath) {
  try { fs.rmSync(filePath, { force: true }); } catch (error) { console.warn('[file:cleanup]', error.message); }
}
