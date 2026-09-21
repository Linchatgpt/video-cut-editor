import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

const uploadSuccess = source.indexOf("setFileId(data.fileId); setDimensions(data.dimensions);");
const backgroundAnalysis = source.indexOf("void analyze(data.fileId);");
const uploadReady = source.indexOf("影片已上傳，可選擇開始 AI 分析或直接新增手動片段");
const manualGate = source.indexOf("{fileId && <div className=\"manual-clip-form\">");
const preservesManual = source.includes("all.filter((clip) => clip.source === 'manual')");

if (uploadSuccess < 0 || uploadReady < 0 || backgroundAnalysis >= 0) {
  throw new Error('上傳後必須停在可選擇 AI 或手動片段的狀態，不得自動啟動分析');
}
if (manualGate < 0) throw new Error('手動新增片段必須只依賴 fileId，不得依賴 AI 分析結果');
if (!preservesManual) throw new Error('AI 分析不得覆蓋既有手動片段');

console.log('manual fallback flow: PASS');
