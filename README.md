# 英文島 EnglishIsland

給小朋友的英文練習島。一課三座島（單字、文法、閱讀），答對題目房子就亮燈。

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 靜態輸出到 out/
```

- 新增一課：把 Claude 專案產出的 `uNN.json` 放進 `src/content/units/`，在 `src/content/units/index.ts` 加一行，`npm test` 檢查格式。
- 內容格式：`docs/content-format.md`
- Claude 專案指令：`docs/claude-project-instructions.md`
- 開發規範：`CLAUDE.md`
