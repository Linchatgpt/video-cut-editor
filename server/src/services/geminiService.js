import { GoogleGenAI } from '@google/genai';

export async function chooseHighlights(transcript, { apiKey = process.env.GEMINI_API_KEY, clipCount = 3, clipDuration = 15 } = {}) {
  if (!apiKey) throw new Error('尚未設定 GEMINI_API_KEY，無法進行 AI 片段分析');
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `你是短影音剪輯師，正在分析一支可能是演唱、歌唱或純音樂的影片。請從以下帶時間戳逐字稿挑選 ${clipCount} 個最有價值的片段，每段約 ${clipDuration} 秒。歌詞只用來判斷情緒、段落與高潮，不要逐字重現或長篇引用歌詞；上欄與下欄請改寫成繁體中文短標題與內容摘要。即使逐字稿不完整、只有哼唱、歌聲或音樂，也必須根據可用時間戳回傳候選片段，不要回覆道歉、解釋或拒絕。每個片段請分別產生上欄與下欄字卡內容：上欄是吸睛主句，下欄是補充重點。只回傳 JSON 陣列，不要 Markdown：[{"id":"clip-1","title":"內部標題","top_text":"上欄字卡","bottom_text":"下欄字卡","start_time":0,"end_time":${clipDuration}}]。時間必須來自逐字稿範圍，所有文字使用繁體中文。\n逐字稿：${JSON.stringify(transcript.segments)}`;
  try {
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.2 } });
    const raw = response.text?.trim() || '';
    const json = parseJsonResponse(raw);
    return json;
  } catch (error) {
    console.error('[gemini:error]', { message: error.message });
    throw new Error(`Gemini 片段分析失敗：${error.message}`);
  }
}

function parseJsonResponse(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  try { return JSON.parse(cleaned); } catch (_error) {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_nestedError) { /* use the clearer error below */ }
    }
    console.error('[gemini:invalid-json]', { preview: raw.slice(0, 300) });
    throw new Error('Gemini 沒有回傳有效的片段 JSON，請重新分析一次');
  }
}

export function validateHighlights(clips, duration, { clipCount = 3, clipDuration = 15 } = {}) {
  if (!Array.isArray(clips) || clips.length === 0 || clips.length > clipCount) throw new Error(`AI 回傳的片段數量不可超過 ${clipCount} 個`);
  const normalized = clips.map((clip, index) => {
    let start = Number(clip.start_time); let end = Number(clip.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start >= duration) throw new Error(`第 ${index + 1} 個片段的時間範圍無效`);
    if (end - start < clipDuration - 2 || end - start > clipDuration + 2) {
      start = Math.max(0, Math.min(start, duration - clipDuration));
      end = Math.min(duration, start + clipDuration);
      console.warn('[gemini:normalize-time]', { index: index + 1, requested: { start: clip.start_time, end: clip.end_time }, normalized: { start, end } });
    }
    start = Math.round(start * 10) / 10;
    end = Math.round(end * 10) / 10;
    return { id: String(clip.id || `clip-${index + 1}`), title: String(clip.title || '精彩片段').slice(0, 45), top_text: String(clip.top_text || clip.title || '精彩片段').slice(0, 60), bottom_text: String(clip.bottom_text || clip.title || '精彩片段').slice(0, 80), start_time: start, end_time: end };
  });
  for (let index = 1; index < normalized.length; index += 1) {
    const previousEnd = normalized[index - 1].end_time;
    if (normalized[index].start_time < previousEnd) {
      const start = previousEnd;
      const end = Math.min(duration, start + clipDuration);
      if (end <= start) throw new Error('影片長度不足以容納所有候選片段');
      console.warn('[gemini:normalize-overlap]', { index: index + 1, normalized: { start, end } });
      normalized[index].start_time = start;
      normalized[index].end_time = end;
    }
  }
  return normalized;
}
