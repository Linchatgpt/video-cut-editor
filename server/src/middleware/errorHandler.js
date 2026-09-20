export function errorHandler(error, request, response, _next) {
  console.error('[api:error]', {
    method: request.method,
    path: request.path,
    message: error.message,
    stack: error.stack,
  });

  if (error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({ error: '影片檔案不可超過 2 GB' });
  }

  const pipelineError = /Whisper|Gemini|FFmpeg|語音辨識|片段分析|音訊抽取|GEMINI_API_KEY/.test(error.message || '');
  if (pipelineError) {
    return response.status(503).json({ error: error.message });
  }

  return response.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : '伺服器發生未預期錯誤',
  });
}
