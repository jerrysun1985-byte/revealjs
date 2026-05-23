# Client Presentation Hub (GitHub Pages)

這個 repository 是「單一入口多簡報平台」。

- 入口網址：`https://jerrysun1985-byte.github.io/revealjs/`
- 每份簡報子頁：`/revealjs/decks/<client>/<yyyy-mm-dd-topic-slug>/`
- 簡報索引：`/revealjs/data/decks.json`

## 專案結構

- `index.html`: 首頁入口（卡片導覽）
- `src/home.js`, `src/home.css`: 首頁渲染與樣式
- `public/data/decks.json`: 所有簡報索引資料
- `public/data/auth-config.json`: 子頁密碼設定（雜湊值、提示、更新時間）
- `public/decks/...`: 每份簡報獨立子頁
- `public/templates/deck/`: 新增簡報可直接複製的模板

## 新增一份簡報（標準流程）

1. 複製模板

```bash
cp -R public/templates/deck public/decks/<client>/<yyyy-mm-dd-topic-slug>
```

2. 編輯 `public/decks/<client>/<yyyy-mm-dd-topic-slug>/slides.md`

3. 更新 `public/data/decks.json`，新增一筆 deck metadata

最少欄位：

- `id`
- `client`
- `title`
- `date`
- `slug`
- `path`
- `tags`
- `status` (`active` | `archived` | `draft`)
- `auth.required` (`true` | `false`)
- `auth.key` (對應 `auth-config.json` 的 key)

4. 本機預覽與建置

```bash
npm run dev
npm run build
```

5. Push 到 `main`，GitHub Pages 會自動部署

## 子頁密碼保護

- 所有 deck 頁面進入前都會先檢查 `decks.json` 的 `auth` 設定。
- 密碼集中在 `public/data/auth-config.json` 管理。
- 變更密碼流程：
  1. 產生新密碼的 SHA-256 雜湊
  2. 更新 `auth-config.json` 對應 key 的 `hash`
  3. 建議同步更新 `updatedAt`（會使舊 session 失效）
  4. Push 部署

範例（產生 SHA-256）：

```bash
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('你的新密碼').digest('hex'));"
```

## 更新/下架簡報

- 更新：直接改該 deck 的 `slides.md`。
- 下架但保留紀錄：將 `status` 改成 `archived`。
- 草稿：將 `status` 改成 `draft`。

## 注意事項

- 建議 slug 使用小寫英文與 `-`，例如 `2026-05-30-textile-dyeing-notes`。
- 新 deck 路徑應與 `decks.json` 的 `path` 完全一致。
- 若修改首頁結構，請確認 `home.js` 仍能正確讀取 `decks.json`。
