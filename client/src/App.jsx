import { useState } from 'react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);

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
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <span className="upload-icon">↑</span>
          <strong>{selectedFile ? selectedFile.name : '拖曳影片到這裡，或點擊選擇'}</strong>
          <small>MP4 / MOV / WebM / MKV · 最大 2 GB</small>
          {selectedFile && <span className="file-ready">素材已準備好，下一步可開始分析</span>}
        </label>
      </section>

      <section className="workspace-preview" aria-label="分析工作區預覽">
        <div className="preview-header">
          <div>
            <p className="section-kicker">02 / 審查與編輯</p>
            <h3>你的片段會在這裡出現</h3>
          </div>
          <span className="muted-label">尚未分析</span>
        </div>
        <div className="empty-track">
          <div className="track-line" />
          <span className="track-start">00:00</span>
          <span className="track-end">— — —</span>
        </div>
      </section>
    </main>
  );
}
