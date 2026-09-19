# Local-first AI Reels MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個無資料庫的本地端 AI 影片剪輯工具，從長影片產生可編輯、可下載的 9:16 Reels 短影音。

**Architecture:** Vite + React 提供剪輯工作台；Node.js + Express 提供本地 API。檔案保存在 `server/uploads`、`server/temp` 與 `server/outputs`，FFmpeg 負責影音處理，Whisper adapter 負責逐字稿，Gemini adapter 負責片段挑選與標題建議，Puppeteer 負責透明字卡。

**Tech Stack:** Vite, React, Express, CORS, Multer, fluent-ffmpeg, Puppeteer, `@google/genai`, Whisper-compatible local adapter, FFmpeg.

**Spec:** `docs/superpowers/specs/2026-09-19-local-first-reels-mvp-design.md`

## Global Constraints

- 不使用資料庫。
- 原始影片、暫存檔、分析結果與輸出影片保存於本地檔案系統。
- 使用者可以修改標題、字卡文字與片段時間。
- 最終影片輸出為 1080x1920 的 9:16 MP4。
- FFmpeg、Whisper 與 Gemini 失敗時必須有清楚 log 與 API 錯誤回應。
- 每個主要步驟完成後停下來請使用者確認。

## Review Focus

- 不支援或過大的影片上傳必須被拒絕，而不是讓 FFmpeg 稍後失敗。
- 缺少 Whisper 或 Gemini 設定時，分析 API 必須回傳可理解的設定錯誤。
- AI 回傳不合法的片段時間或 JSON 時，後端必須驗證並拒絕，不得產生錯誤影片。
- 使用者輸入標題包含 HTML 或特殊字元時，字卡渲染必須安全且能正確顯示。
- FFmpeg 輸出失敗時不得回傳假下載連結，也不得刪除原始影片。

### Task 1: 專案初始化與本地上傳 API

**Files:**
- Create: `package.json`
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/styles.css`
- Create: `server/package.json`
- Create: `server/src/server.js`
- Create: `server/src/routes/upload.js`
- Create: `server/src/middleware/errorHandler.js`
- Create: `server/uploads/.gitkeep`
- Create: `server/temp/.gitkeep`
- Create: `server/outputs/.gitkeep`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- `POST /api/upload` accepts multipart field `video` and returns `{ fileId, originalName, path }`.
- `GET /api/health` returns `{ ok: true, service: "video-editor-api" }`.
- Frontend development server proxies `/api` to the Express server.

- [ ] **Step 1: 建立目錄與 package scripts**

```json
{
  "scripts": {
    "dev:client": "npm --prefix client run dev",
    "dev:server": "npm --prefix server run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""
  }
}
```

- [ ] **Step 2: 安裝並固定必要依賴**

使用 `express`、`cors`、`multer`、`fluent-ffmpeg`、`puppeteer`、`@google/genai` 與前端 React/Vite 依賴，並將實際安裝版本寫入 lockfile。

- [ ] **Step 3: 實作安全的影片上傳**

Multer 使用明確的 `server/uploads` 目錄、檔案大小上限與影片 MIME/副檔名白名單；檔名使用 UUID，避免路徑穿越與同名覆蓋。缺檔、格式不支援與超限時回傳 400/413 JSON 錯誤。

- [ ] **Step 4: 建立健康檢查與集中錯誤處理**

所有非預期錯誤記錄 stack/context，對外只回傳安全且可理解的錯誤訊息，不洩漏本地機敏路徑。

- [ ] **Step 5: 建立最小前端上傳畫面**

顯示產品用途、影片選擇器、上傳進度/狀態與錯誤訊息；先保留分析區的空狀態。樣式遵循剪輯工作台方向，包含鍵盤 focus 與窄螢幕版面。

- [ ] **Step 6: 驗證步驟一**

執行 `npm install`、啟動前後端、呼叫 `/api/health`，再以一個小型影片測試 `/api/upload`，確認檔案落在 `server/uploads` 且未被 Git 追蹤。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json client server .env.example .gitignore README.md
git commit -m "feat: initialize local video editor and upload API"
```

### Task 2: 音訊抽取與逐字稿 adapter

**Files:**
- Create: `server/src/services/ffmpegService.js`
- Create: `server/src/services/transcriptionService.js`
- Create: `server/src/routes/analyze.js`
- Modify: `server/src/server.js`
- Modify: `server/package.json`

**Interfaces:**
- `extractAudio(videoPath, wavPath): Promise<void>`
- `transcribeAudio(wavPath): Promise<{ segments: Array<{ start: number, end: number, text: string }> }>`
- `POST /api/analyze` accepts `{ fileId }` and returns a validated transcript plus analysis job result.

- [ ] **Step 1: Write the failing tests for path validation and FFmpeg failure mapping.**
- [ ] **Step 2: Run the tests and verify they fail.**
- [ ] **Step 3: Implement FFmpeg extraction with command context and stderr logging.**
- [ ] **Step 4: Implement a local Whisper-compatible adapter with explicit configuration errors.**
- [ ] **Step 5: Implement `/api/analyze` input validation and temporary-file cleanup.**
- [ ] **Step 6: Run unit tests and a real audio extraction smoke test.**
- [ ] **Step 7: Commit `feat: add local transcription analysis pipeline`.**

### Task 3: Gemini 高光片段與標題決策

**Files:**
- Create: `server/src/services/clipSelectionService.js`
- Create: `server/src/services/geminiService.js`
- Modify: `server/src/routes/analyze.js`
- Create: `server/test/clipSelectionService.test.js`

**Interfaces:**
- `selectHighlights(transcript): Promise<Array<{ id: string, title: string, start_time: number, end_time: number }>>`
- 結果必須是 1–3 個片段；每段長度介於 10–20 秒；時間不可重疊且不可超出影片範圍。

- [ ] **Step 1: Write failing tests for valid, malformed, overlapping, and out-of-range AI results.**
- [ ] **Step 2: Run tests to verify malformed results fail validation.**
- [ ] **Step 3: Implement a strict JSON prompt and response parser for Gemini.**
- [ ] **Step 4: Implement deterministic validation and normalization of titles and timestamps.**
- [ ] **Step 5: Return clear errors for missing API key, timeout, invalid JSON, and service failure.**
- [ ] **Step 6: Run tests with mocked Gemini responses and one opt-in integration smoke test.**
- [ ] **Step 7: Commit `feat: add AI highlight selection`.**

### Task 4: 前端審查、編輯與片段預覽

**Files:**
- Create: `client/src/components/UploadPanel.jsx`
- Create: `client/src/components/ClipReviewList.jsx`
- Create: `client/src/components/ClipReviewCard.jsx`
- Create: `client/src/lib/api.js`
- Modify: `client/src/App.jsx`
- Modify: `client/src/styles.css`

**Interfaces:**
- Frontend clip state uses `{ id, title, caption, start_time, end_time }`.
- Preview action sets the HTML video `currentTime` to `start_time` and pauses when `end_time` is reached.

- [ ] **Step 1: Write the upload/analyze client functions and error-state tests.**
- [ ] **Step 2: Build the upload panel and connect it to `/api/upload` and `/api/analyze`.**
- [ ] **Step 3: Build editable clip cards with controlled inputs and numeric validation.**
- [ ] **Step 4: Add video preview playback bounded by selected clip timestamps.**
- [ ] **Step 5: Test keyboard navigation, narrow viewport layout, and preservation of edited state.**
- [ ] **Step 6: Commit `feat: add human-in-the-loop clip review UI`.**

### Task 5: Puppeteer 字卡與 FFmpeg 直式輸出

**Files:**
- Create: `server/src/services/titleCardService.js`
- Create: `server/src/services/renderService.js`
- Create: `server/src/routes/render.js`
- Modify: `server/src/server.js`
- Create: `server/test/renderValidation.test.js`

**Interfaces:**
- `renderTitleCard({ title, caption, outputPath }): Promise<string>`
- `renderClip({ sourcePath, clip, titleLayerPath, outputPath }): Promise<string>`
- `POST /api/render` accepts `{ fileId, clips }` and returns `{ outputs: [{ id, downloadUrl, path }] }`.

- [ ] **Step 1: Write failing tests for render payload validation and path safety.**
- [ ] **Step 2: Implement HTML escaping and Puppeteer transparent 1080x1920 screenshot generation.**
- [ ] **Step 3: Implement FFmpeg trim, center crop, scale, and overlay filter with explicit output settings.**
- [ ] **Step 4: Implement per-clip orchestration, cleanup, and failure isolation.**
- [ ] **Step 5: Expose safe static downloads from `server/outputs` without exposing uploads.**
- [ ] **Step 6: Run a real end-to-end render smoke test with a short local video.**
- [ ] **Step 7: Commit `feat: render vertical reels with title cards`.**

### Task 6: 前端確認渲染、下載與文件完善

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/ClipReviewList.jsx`
- Modify: `client/src/lib/api.js`
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Add the confirmation payload and `/api/render` call.**
- [ ] **Step 2: Show per-clip render progress, failures, and completed download links.**
- [ ] **Step 3: Document FFmpeg installation, local Whisper setup, Gemini environment variables, and startup commands.**
- [ ] **Step 4: Run the full local smoke test from upload through download.**
- [ ] **Step 5: Run the final verification checklist and commit `docs: complete MVP setup and usage guide`.**

