# Local AI Reels MVP

本專案是 local-first 的 AI 影片自動剪輯工具：上傳長影片後，分析高光片段、修改標題與字卡，最後輸出可下載的 9:16 Reels MP4。MVP 不使用資料庫，影片與輸出檔保存在本機。

## 目前進度

已完成步驟一的專案骨架與影片上傳 API。AI 分析、字卡與渲染會在後續步驟加入。

## 環境需求

- Node.js 20+
- npm 10+
- FFmpeg（後續影音處理需要）

## 啟動

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

- 前端：http://localhost:5173
- 後端健康檢查：http://localhost:8787/api/health
- 上傳檔案保存於 `server/uploads/`

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
