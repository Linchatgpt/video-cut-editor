# Local AI Reels MVP

本專案是 local-first 的 AI 影片自動剪輯工具：上傳長影片後，分析高光片段、修改標題與字卡，最後輸出可下載的 9:16 Reels MP4。MVP 不使用資料庫，影片與輸出檔保存在本機。

## 目前進度

已完成步驟一的專案骨架與影片上傳 API。AI 分析、字卡與渲染會在後續步驟加入。

## 環境需求

- Node.js 20+
- npm 10+
- FFmpeg（後續影音處理需要）
- whisper.cpp 的 `whisper-cli` 與本地模型（本機預設使用 `server/models/ggml-base.bin`）

## 啟動

```bash
npm install
npm --prefix server install
npm --prefix client install
cp .env.example .env
npm run dev
```

啟動前請在 `.env` 填入自己的 `GEMINI_API_KEY`。請只在本機編輯此檔案，不要把 key 貼到聊天或提交到 Git；`.env` 已被忽略。

- 前端：http://localhost:5173
- 後端健康檢查：http://localhost:8787/api/health
- 上傳檔案保存於 `server/uploads/`

## 公開部署準備

前端可部署到 Netlify，根目錄的 `netlify.toml` 已設定：

- Base directory：`client`
- Build command：`npm run build`
- Publish directory：`dist`

影片分析與渲染仍由 Mac mini 上的 Express、FFmpeg、Whisper 執行。公開部署前，需將 Mac mini API 透過 HTTPS 公開網址提供給前端，並在 Netlify 的環境變數設定：

```text
VITE_API_BASE_URL=https://你的公開-api-網址
```

本機開發時保持空白即可，Vite 會繼續使用 `localhost:8787` 代理。

## API

```bash
curl http://localhost:8787/api/health
curl -F "video=@/path/to/video.mp4" http://localhost:8787/api/upload
```

## 測試

```bash
npm test
npm --prefix client run build
```

## 本地語音辨識

目前使用 Homebrew 的 `whisper-cli` 與本地 Whisper base 模型，不會上傳影片。若需要指定其他模型或執行檔，可在 `.env` 設定：

```bash
WHISPER_COMMAND=whisper-cli
WHISPER_MODEL=./server/models/ggml-base.bin
```
