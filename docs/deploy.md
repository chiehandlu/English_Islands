# 部署紀錄

## Claude artifact（試玩版）

- slug：`eab270ca-979c-4081-8347-2ef157063cd0`（最新版本 `1794134280-daef`）
- 網址：https://claude.ai/artifact/VyvQ25WGXFSTJS39qdz7yZ
- 重新發佈：`npm run build:artifact`，把 `out/` 的檔案以 `publish_files` 發佈（`mode: replace`），對應規則見 CLAUDE.md「部署」。
- artifact 的頁面實際放在 `https://<slug>.frame.claudeusercontent.com/_f/<版本>/`，所以資源一定要用相對路徑、只能有一個 `index.html`。

## Cloudflare Pages（正式版）

- 網址：https://english-islands.pages.dev （Pages 專案 `english-islands`）
- GitHub repo：https://github.com/chiehandlu/English_Islands（`main` 分支，push 就自動部署；其他分支會產生 preview 網址）
- 環境變數 `NODE_VERSION=22`（與 `.node-version` 相同，雙保險）
- 設定：Framework preset = Next.js (Static HTML Export)，build command `npm run build`，output directory `out`。
- Node 版本由根目錄 `.node-version`（22）決定；Cloudflare 預設的 Node 18 跑不動 Next 16。
