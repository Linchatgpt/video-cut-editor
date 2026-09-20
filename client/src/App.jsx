import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [clips, setClips] = useState([]);
  const [status, setStatus] = useState('等待上傳');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState('');
  const defaultStyle = { topText: { color: '#2F80ED', fontSize: 72, fontFamily: 'Noto Sans TC', x: 50, y: 22 }, bottomText: { color: '#2F80ED', fontSize: 72, fontFamily: 'Noto Sans TC', x: 50, y: 52 } };
  const [style, setStyle] = useState(defaultStyle);
  const [outputs, setOutputs] = useState([]);
  const [clipCount, setClipCount] = useState(3);
  const [clipDuration, setClipDuration] = useState(15);

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
      const analyzeResponse = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: uploadResult.fileId, clipCount, clipDuration }) });
      const analyzeResult = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(analyzeResult.error || '影片分析失敗');
      setClips(analyzeResult.clips.map((clip) => ({ ...clip, caption: clip.title, style: structuredClone(defaultStyle) })));
      setStatus(`已找到 ${analyzeResult.clips.length} 個候選片段`);
    } catch (requestError) { setError(requestError.message); setStatus('需要處理'); }
  }

  async function analyzeExistingVideo() {
    if (!fileId) return;
    setError(''); setStatus('正在分析語音與高光片段…');
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, clipCount, clipDuration }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '影片分析失敗');
      setClips(result.clips.map((clip) => ({ ...clip, caption: clip.title, style: structuredClone(defaultStyle) }))); setStatus(`已找到 ${result.clips.length} 個候選片段`);
    } catch (requestError) { setError(requestError.message); setStatus('需要處理'); }
  }

  function updateClip(id, field, value) { setClips((current) => current.map((clip) => clip.id === id ? { ...clip, [field]: field.includes('time') ? Number(value) : value } : clip)); }
  function updateClipStyle(id, layer, field, value) { setClips((current) => current.map((clip) => clip.id === id ? { ...clip, style: { ...clip.style, [layer]: { ...clip.style[layer], [field]: ['fontSize', 'x', 'y'].includes(field) ? Number(value) : value } } } : clip)); }
  function previewClip(clip) { const video = videoRef.current; if (!video) return; video.currentTime = clip.start_time; video.play(); const stop = () => { if (video.currentTime >= clip.end_time) { video.pause(); video.removeEventListener('timeupdate', stop); } }; video.addEventListener('timeupdate', stop); }
  async function renderReels() { setStatus('正在渲染 Reels…'); setError(''); try { const response = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, clips, style }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '影片渲染失敗'); setOutputs(result.outputs); setStatus('渲染完成，可下載影片'); } catch (requestError) { setError(requestError.message); setStatus('需要處理'); } }
  async function renderOne(clip) { updateClip(clip.id, 'rendering', true); try { const response = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, clips: [clip] }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '影片渲染失敗'); setClips((current) => current.map((item) => item.id === clip.id ? { ...item, rendering: false, renderedUrl: result.outputs[0].downloadUrl } : item)); } catch (requestError) { setError(requestError.message); updateClip(clip.id, 'rendering', false); } }

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

      <section className="analysis-settings" aria-label="AI 片段分析設定"><p className="section-kicker">AI 分析參數</p><label>片段數量<input type="number" min="1" max="5" value={clipCount} onChange={(event) => setClipCount(Number(event.target.value))} /></label><label>每段秒數<input type="number" min="10" max="60" value={clipDuration} onChange={(event) => setClipDuration(Number(event.target.value))} /></label><span>AI 會依照這兩個參數挑選候選片段，之後仍可逐支微調。</span></section>

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
        </div> : <>
          <div className="clip-list">{clips.map((clip, index) => <article className="clip-card" key={clip.id}>
          <div className="clip-index">0{index + 1}</div>
          <div className="clip-fields"><label>標題<input value={clip.title} onChange={(event) => updateClip(clip.id, 'title', event.target.value)} /></label><label>字卡文字<input value={clip.caption} onChange={(event) => updateClip(clip.id, 'caption', event.target.value)} /></label><div className="time-row"><label>開始<input type="number" step="0.1" value={clip.start_time} onChange={(event) => updateClip(clip.id, 'start_time', event.target.value)} /></label><label>結束<input type="number" step="0.1" value={clip.end_time} onChange={(event) => updateClip(clip.id, 'end_time', event.target.value)} /></label><button type="button" onClick={() => previewClip(clip)}>預覽片段</button></div><div className="position-stage"><div className="stage-text" style={{ left: `${clip.style?.topText?.x || 50}%`, top: `${clip.style?.topText?.y || 22}%`, background: clip.style?.topText?.color }} /><div className="stage-text" style={{ left: `${clip.style?.bottomText?.x || 50}%`, top: `${clip.style?.bottomText?.y || 52}%`, background: clip.style?.bottomText?.color }} /></div><div className="dual-card-controls"><fieldset><legend>上欄文字</legend><div className="control-grid"><label>顏色<input type="color" value={clip.style?.topText?.color || '#2F80ED'} onChange={(event) => updateClipStyle(clip.id, 'topText', 'color', event.target.value)} /></label><label>字型<select value={clip.style?.topText?.fontFamily || 'Noto Sans TC'} onChange={(event) => updateClipStyle(clip.id, 'topText', 'fontFamily', event.target.value)}><option>Noto Sans TC</option><option>Arial</option><option>Georgia</option><option>Courier New</option></select></label><label>字級<input type="number" min="32" max="140" value={clip.style?.topText?.fontSize || 72} onChange={(event) => updateClipStyle(clip.id, 'topText', 'fontSize', event.target.value)} /></label><label>X<input type="range" min="5" max="95" value={clip.style?.topText?.x || 50} onChange={(event) => updateClipStyle(clip.id, 'topText', 'x', event.target.value)} /></label><label>Y<input type="range" min="5" max="95" value={clip.style?.topText?.y || 22} onChange={(event) => updateClipStyle(clip.id, 'topText', 'y', event.target.value)} /></label></div></fieldset><fieldset><legend>下欄文字</legend><div className="control-grid"><label>顏色<input type="color" value={clip.style?.bottomText?.color || '#2F80ED'} onChange={(event) => updateClipStyle(clip.id, 'bottomText', 'color', event.target.value)} /></label><label>字型<select value={clip.style?.bottomText?.fontFamily || 'Noto Sans TC'} onChange={(event) => updateClipStyle(clip.id, 'bottomText', 'fontFamily', event.target.value)}><option>Noto Sans TC</option><option>Arial</option><option>Georgia</option><option>Courier New</option></select></label><label>字級<input type="number" min="32" max="140" value={clip.style?.bottomText?.fontSize || 72} onChange={(event) => updateClipStyle(clip.id, 'bottomText', 'fontSize', event.target.value)} /></label><label>X<input type="range" min="5" max="95" value={clip.style?.bottomText?.x || 50} onChange={(event) => updateClipStyle(clip.id, 'bottomText', 'x', event.target.value)} /></label><label>Y<input type="range" min="5" max="95" value={clip.style?.bottomText?.y || 52} onChange={(event) => updateClipStyle(clip.id, 'bottomText', 'y', event.target.value)} /></label></div></fieldset></div><button className="render-one" type="button" onClick={() => renderOne(clip)} disabled={clip.rendering}>{clip.rendering ? '渲染中…' : '渲染這支 Reel'}</button>{clip.renderedUrl && <div className="rendered-result"><video src={clip.renderedUrl} controls /><a href={clip.renderedUrl}>下載這支 Reel</a></div>}</div>
          </article>)}</div>
          <button className="render-button" type="button" onClick={renderReels}>全部渲染 {clips.length} 支 Reels</button>
          {outputs.length > 0 && <div className="downloads">{outputs.map((output, index) => <a key={output.id} href={output.downloadUrl}>下載 Reel {index + 1}</a>)}</div>}
        </>}
      </section>
    </main>
  );
}
