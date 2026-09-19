# Local-first AI Reels MVP 設計規格

## 目標

建立一個本地端優先的 AI 影片自動剪輯工具。使用者上傳一支長影片後，系統分析語音與內容，挑選約三個、每段約十五秒的高價值片段，產生標題與重點字卡，讓使用者修改後輸出可下載的 9:16 Reels MP4。

## MVP 成功標準

- 使用者可以從 Web UI 上傳影片。
- 系統可以將影片保存於本地檔案系統。
- 系統可以產生約三個候選片段，每個候選片段包含 `id`、`title`、`start_time`、`end_time`。
- 使用者可以修改標題、字卡文字與片段時間。
- 使用者可以預覽指定片段。
- 系統可以使用 FFmpeg 輸出 1080x1920 的直式 MP4。
- 使用者可以下載所有輸出影片。

## Local-first 原則

- 不使用資料庫。
- 原始影片、暫存檔、分析結果與輸出影片均保存於專案目錄。
- 分析結果可先保存在記憶體；若需要跨重啟保存，使用本地 JSON 檔案。
- 語音辨識優先使用本地 Whisper 相容方案；若本機環境無法支援，保留可替換的 API adapter。
- Gemini 只負責內容判斷與標題建議，並透過環境變數設定；未設定時應回傳清楚錯誤。
- Google Drive 不屬於 MVP 必要依賴，未來可作為額外匯出目的地。

## 系統架構

```text
React/Vite Web UI
        │ HTTP JSON / multipart upload
        ▼
Express Local API
        ├── Multer：保存上傳影片
        ├── FFmpeg：抽取音訊、裁切、轉直式、合成
        ├── Whisper adapter：產生帶時間戳逐字稿
        ├── Gemini adapter：挑選片段與產生標題
        └── Puppeteer：輸出透明背景字卡 PNG
        │
        ▼
本地 uploads / temp / outputs 目錄
```

## API 邊界

### `GET /api/health`

回傳服務可用狀態與版本資訊。

### `POST /api/upload`

接受 multipart 欄位 `video`，驗證影片副檔名與檔案大小，保存至 `server/uploads/`，回傳檔案識別資訊。

### `POST /api/analyze`

接受已上傳影片的識別資訊，抽取 WAV、取得逐字稿，交給 AI 選出候選片段。回傳：

```json
{
  "clips": [
    {
      "id": "clip-1",
      "title": "候選標題",
      "start_time": 12.5,
      "end_time": 27.5
    }
  ]
}
```

### `POST /api/render`

接受使用者確認後的片段 JSON 陣列，產生每段影片與下載路徑。

## 前端體驗

前端採用剪輯工作台方向：深色影片預覽區、清楚的片段清單、暖白文字與珊瑚紅主操作色。每個候選片段提供標題輸入框、字卡文字欄位、開始/結束時間輸入框與預覽按鈕。所有可修改欄位都以同一份前端狀態作為 `/api/render` 的輸入。

## 錯誤處理

- API 對缺少檔案、格式不支援、路徑不存在與 JSON 格式錯誤回傳明確的 4xx 訊息。
- FFmpeg 每次執行都記錄完整 command context、stderr、輸入檔與輸出檔；失敗時不留下假成功結果。
- Whisper 與 Gemini 呼叫錯誤需區分設定缺失、逾時、回應格式錯誤與服務錯誤。
- 前端顯示可理解的錯誤訊息，並保留使用者已修改的欄位。
- 暫存檔在成功或失敗後盡量清理，但不得刪除原始上傳檔與已完成輸出檔。

## MVP 不包含

- 使用者帳號與權限。
- 資料庫與雲端檔案儲存。
- 多人協作。
- 自動發布到 Instagram、YouTube 或 TikTok。
- 複雜時間軸編輯器、轉場與多軌剪輯。

## 後續可擴充方向

- 本地模型與雲端模型的可切換設定。
- Google Drive 匯出與備份。
- 自訂字型、品牌色與字幕樣式。
- 批次處理與專案歷史。
