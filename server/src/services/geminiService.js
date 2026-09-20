import { GoogleGenAI } from '@google/genai';

export async function chooseHighlights(transcript, { apiKey = process.env.GEMINI_API_KEY } = {}) {
  if (!apiKey) throw new Error('尚未設定 GEMINI_API_KEY，無法進行 AI 片段分析');
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `你是短影音剪輯師。請從以下帶時間戳逐字稿挑選最多 3 個最有價值的片段，每段約 15 秒。價值可來自清楚觀點、反直覺洞察、情緒轉折或可獨立理解的故事。只回傳 JSON 陣列，不要 Markdown：[{"id":"clip-1","title":"15字內吸睛標題","start_time":0,"end_time":15}]。時間必須來自逐字稿範圍，標題使用繁體中文。\n逐字稿：${JSON.stringify(transcript.segments)}`;
  try {
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: prompt });
    const raw = response.text?.trim() || '';
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
    return json;
  } catch (error) {
    console.error('[gemini:error]', { message: error.message });
    throw new Error(`Gemini 片段分析失敗：${error.message}`);
  }
}

export function validateHighlights(clips, duration) {
  if (!Array.isArray(clips) || clips.length === 0 || clips.length > 3) throw new Error('AI 回傳的片段數量必須介於 1 到 3 個');
  const normalized = clips.map((clip, index) => {
    const start = Number(clip.start_time); const end = Number(clip.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration) throw new Error(`第 ${index + 1} 個片段的時間範圍無效`);
    if (end - start < 10 || end - start > 20) throw new Error(`第 ${index + 1} 個片段長度必須介於 10 到 20 秒`);
    return { id: String(clip.id || `clip-${index + 1}`), title: String(clip.title || '精彩片段').slice(0, 45), start_time: start, end_time: end };
  });
  for (let index = 1; index < normalized.length; index += 1) if (normalized[index].start_time < normalized[index - 1].end_time) throw new Error('AI 回傳的片段時間互相重疊');
  return normalized;
}
