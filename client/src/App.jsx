import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [clips, setClips] = useState([]);
  const [status, setStatus] = useState('等待上傳');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    fetch('/api/default-video').then((response) => response.ok ? response.json() : null).then((defaultVideo) => {
      if (!defaultVideo) return;
      setFileId(defaultVideo.fileId); setVideoUrl(defaultVideo.videoUrl); setStatus('預設影片已載入，可直接開始分析');
      setSelectedFile({ name: defaultVideo.originalName });
    }).catch(() => {});
  }, []);

  useEffect(() => () => videoUrl && URL.revokeObjectURL(videoUrl), [videoUrl]);

  async function uploadAndAnalyze(file) {
    setSelectedFile(file); setError(''); setStatus('正在上傳…'); setClips([]);
    const nextVideoUrl = URL.createObjectURL(file); setVideoUrl(nextVideoUrl);
    try {
      const formData = new FormData(); formData.append('video', file);
      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.error || '影片上傳失敗');
      setFileId(uploadResult.fileId); setStatus('正在分析語音與高光片段…');
      const analyzeResponse = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: uploadResult.fileId }) });
      const analyzeResult = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(analyzeResult.error || '影片分析失敗');
      setClips(analyzeResult.clips.map((clip) => ({ ...clip, caption: clip.title })));
      setStatus(`已找到 ${analyzeResult.clips.length} 個候選片段`);
    } catch (requestError) { setError(requestError.message); setStatus('需要處理'); }
  }

  async function analyzeExistingVideo() {
    if (!fileId) return;
    setError(''); setStatus('正在分析語音與高光片段…');
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '影片分析失敗');
      setClips(result.clips.map((clip) => ({ ...clip, caption: clip.title }))); setStatus(`已找到 ${result.clips.length} 個候選片段`);
    } catch (requestError) { setError(requestError.message); setStatus('需要處理'); }
  }

  function updateClip(id, field, value) { setClips((current) => current.map((clip) => clip.id === id ? { ...clip, [field]: field.includes('time') ? Number(value) : value } : clip)); }
  function previewClip(clip) { const video = videoRef.current; if (!video) return; video.currentTime = clip.start_time; video.play(); const stop = () => { if (video.currentTime >= clip.end_time) { video.pause(); video.removeEventListener('timeupdate', stop); } }; video.addEventListener('timeupdate', stop); }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <div>
          <p className="eyebrow">LOCAL REELS LAB</p>
          <h1>把長片剪成值得看的片段。</h1>
        </div>
        <span className="status-dot">本機工作區</span>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="section-kicker">01 / 上傳素材</p>
          <h2>找到觀眾會停下來看的 15 秒。</h2>
          <p className="hero-description">
            上傳一支長影片，AI 會先替你找出有價值的片段。你可以修改標題、時間與字卡，再輸出直式 Reels。
          </p>
        </div>

        <label className="upload-zone">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={(event) => event.target.files?.[0] && uploadAndAnalyze(event.target.files[0])}
          />
          <span className="upload-icon">↑</span>
          <strong>{selectedFile ? selectedFile.name : '拖曳影片到這裡，或點擊選擇'}</strong>
          <small>MP4 / MOV / WebM / MKV · 最大 2 GB</small>
          {selectedFile && <span className="file-ready">{status}</span>}
          {fileId === 'default' && clips.length === 0 && <button type="button" onClick={(event) => { event.preventDefault(); analyzeExistingVideo(); }}>開始分析預設影片</button>}
        </label>
      </section>

      <section className="workspace-preview" aria-label="分析工作區預覽">
        <div className="preview-header">
          <div>
            <p className="section-kicker">02 / 審查與編輯</p>
            <h3>你的片段會在這裡出現</h3>
          </div>
          <span className="muted-label">{status}</span>
        </div>
        {videoUrl && <video ref={videoRef} className="source-video" src={videoUrl} controls />}
        {error && <p className="error-message">{error}</p>}
        {clips.length === 0 ? <div className="empty-track">
          <div className="track-line" />
          <span className="track-start">00:00</span>
          <span className="track-end">— — —</span>
        </div> : <div className="clip-list">{clips.map((clip, index) => <article className="clip-card" key={clip.id}>
          <div className="clip-index">0{index + 1}</div>
          <div className="clip-fields"><label>標題<input value={clip.title} onChange={(event) => updateClip(clip.id, 'title', event.target.value)} /></label><label>字卡文字<input value={clip.caption} onChange={(event) => updateClip(clip.id, 'caption', event.target.value)} /></label><div className="time-row"><label>開始<input type="number" step="0.1" value={clip.start_time} onChange={(event) => updateClip(clip.id, 'start_time', event.target.value)} /></label><label>結束<input type="number" step="0.1" value={clip.end_time} onChange={(event) => updateClip(clip.id, 'end_time', event.target.value)} /></label><button type="button" onClick={() => previewClip(clip)}>預覽片段</button></div></div>
        </article>)}</div>}
      </section>
    </main>
  );
}
