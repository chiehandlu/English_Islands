# 部署紀錄

## Claude artifact（試玩版）

- slug：`eab270ca-979c-4081-8347-2ef157063cd0`
- 網址：https://claude.ai/artifact/VyvQ25WGXFSTJS39qdz7yZ
- 重新發佈：`npm run build:artifact`，把 `out/` 的檔案以 `publish_files` 發佈（`mode: replace`），對應規則見 CLAUDE.md「部署」。
- artifact 的頁面實際放在 `https://<slug>.frame.claudeusercontent.com/_f/<版本>/`，所以資源一定要用相對路徑、只能有一個 `index.html`。

## Cloudflare Pages（正式版）

- 尚未設定。接上 GitHub repo 後：Framework preset = Next.js (Static HTML Export)，build command `npm run build`，output directory `out`。
