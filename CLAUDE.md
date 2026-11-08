# EnglishIsland｜英文島

給國小四年級小朋友的英文練習遊戲（私人使用，iPad Safari 為主）。畫面是一座可探索的 3D 等角群島：**一個課本單元＝三座相鄰的小島**（單字島、文法島、閱讀島）加一座**複習島**，島上的建築＝一個題組，答對題目建築就亮燈拿星（0–3 顆）；三座課程島全亮，下一個單元才開放、本單元的複習島也才開放。單字島的第 5 棟是自動產生的「拼字練習」（聽英文、拼出來）。答錯的題目進「錯題袋」，隔天再出；每題累計的對錯次數決定「常錯題」，複習島和拼字練習會優先出這些。每次挑戰賺金幣和材料，到**農場島**換寵物、餵食、蓋裝飾（規則見 `docs/reward-design.md`）。

引擎沿用 [BeAParent](https://github.com/chiehandlu/BeAParent)（Heart Island 機制），機制拆解見 `docs/reference/heart-island-spec.md`。**只參考機制與版面，不得沿用原站的品牌、標誌、人名與文字。**

@AGENTS.md

## 技術選型

| 項目      | 選擇                                                                   | 備註                                                                            |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 框架      | Next.js 16（App Router）+ TypeScript strict，`output: "export"` 純靜態 | 版本與訓練資料不同，寫 Next 相關程式前先讀 `node_modules/next/dist/docs/`       |
| 3D        | three + React Three Fiber + drei                                       | 幾何一律程式化產生，不使用外部模型檔                                            |
| 樣式      | Tailwind CSS v4                                                        | 色票在 `src/app/globals.css` 的 `@theme`；共用元件 class 在 `@layer components` |
| 朗讀      | 瀏覽器 `speechSynthesis`（`src/lib/speech.ts`）                        | 英文 en-US、中文 zh-TW；不用任何 TTS API                                        |
| 音效      | Howler.js，經 `src/lib/audio.ts` 包裝                                  | 預設靜音                                                                        |
| 狀態      | Zustand：`gameStore`（persist 到 localStorage）、`uiStore`（不存檔）   | 無後端、無帳號                                                                  |
| 選取狀態  | URL hash（`#island=…` / `#building=…` / `#flow=…`）                    | `src/lib/selection.ts`                                                          |
| 測試      | Vitest                                                                 | 測 `src/game/`、`src/scene/` 純邏輯與 `src/content/` 內容規則                   |
| Lint/格式 | ESLint（eslint-config-next）+ Prettier（printWidth 100）               |                                                                                 |

## 指令

```bash
npm run dev        # 開發伺服器
npm run build      # 靜態輸出到 out/
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run format     # Prettier
```

提交前必須通過：`npm run lint && npm run typecheck && npm test && npm run build`。

## 目錄結構

```
src/
  app/               # 只有一個路由 /；畫面由 uiStore.view 切換（home / play / report）
  components/
    App.tsx          # view 切換；StartCard（首頁）、ReportView（家長頁）
    scene/           # R3F 3D 元件：World、Islands、FarmIsland、Bridges、FlowArcs、Walkers、CameraRig
    hud/             # 疊在 canvas 上的 DOM 介面：TopBar、IndexPanel、DetailCard、QuizPanel、FarmCard、RewardList
  game/              # 純 TS 遊戲規則：types、engine（星等／解鎖）、quiz（出題／判題）、review（錯題袋、常錯統計、複習題組）、
                     #   rewards（金幣／掉落／每日上限／里程碑）、farm（領養／餵食／裝飾／上限）、dayClock
  scene/             # 純 TS 場景數學：六角座標、小人狀態機、燈光內插、farm（農場 19／37 格與寵物漫步）
  content/
    units/           # 內容資料：每單元一個 uNN.json；index.ts 列出所有單元
    farm.ts          # 農場圖鑑：寵物、裝飾、價格、掉落表（資料，改數字不用動程式）
    islands.ts       # 由 UNITS 推導 ISLANDS（編號、axial 位置、所屬單元），並自動加上拼字練習與複習島
    flows.ts         # 由單元自動推導協作線（單字→文法→閱讀→複習）
    world.ts         # 由資料推導場景配置
  store/             # Zustand store
  lib/               # 瀏覽器工具（朗讀、音效、URL 選取）
docs/
  content-format.md             # unit JSON 格式（也放進 Claude 專案知識）
  reward-design.md              # 獎勵機制設計書（金幣、材料、農場、寵物、價格、可調參數）
  claude-project-instructions.md # Claude 專案「英文島」的指令全文
  reference/                    # Heart Island 規格書
```

## 架構規則

1. **規則與畫面分離**：星等、解鎖、判題、錯題排程寫在 `src/game/`；座標換算、小人移動、燈光計算寫在 `src/scene/`。兩者都必須是無副作用的純函式並有測試。元件和 store 只呼叫它們，不自行計算。
2. **內容即資料**：新增單元只加 `src/content/units/uNN.json` 和 `index.ts` 一行，不改引擎與場景元件。島的位置由單元順序推導（`islands.ts` 的 `islandAxial`），內容檔不寫座標。
3. **一單元三島＋複習島**：內容檔的 `kind` 固定 `vocab` / `grammar` / `reading` 各一；每島 1–5 棟（六角島只有這麼多格），單字島人寫的最多 4 棟。`content/islands.ts` 推導時自動加上：單字島第 5 棟 `uNN-spell`（`generated: "dictation"`，題目來自全單元 `cards`，`mode: "dictation"`）與第四座島 `uNN-review`（`kind: "review"`，三棟 `generated: "review"` 各對應一種 `reviewKind`，`questions` 為空，出題時由 `review.ts` 的 `reviewSet` 動態組）。單元完成（`unitComplete`）與全三星只看三座課程島（`coreIslandsOfUnit`）；複習島在單元完成前 `islandStatus` 為 `locked`。材料掉落照題目原本的島（`originKind`）。`content.test.ts` 會檢查。
4. **進度只存五樣**：`player`、`progress`（每棟 `stars`/`best`/`attempts`）、`mistakes`（錯題與下次複習日）、`questionStats`（每題累計 `wrong`/`right`/`lastWrong`）、`farm`（背包、寵物、裝飾、每日計數、已領里程碑）。島與單元的狀態一律由此推導。星星只升不降，農場的東西只進不出（拆裝飾退一半材料是唯一例外）。「常錯題」＝`troubleScore = wrong×2 − right > 0`，答對會慢慢抵銷。
5. **星等**：答對率 ≥ 0.9 三顆、≥ 0.7 兩顆、≥ 0.5 一顆；一顆星以上＝亮燈。改門檻只改 `engine.ts` 的 `starsForRatio` 與測試。
   **獎勵**：金幣 1/2/3、首次全對 +2、每棟每天前 5 次全額；材料每答對一題掉一個，依「島 × 題型」查 `content/farm.ts` 的 `dropFor`。數字都在 `rewards.ts` 的 `REWARD_CONFIG` 與 `farm.ts` 的 `FARM_CONFIG`。結算順序固定：`recordResult` → `applyRunRewards` → `claimMilestones`（`gameStore.finishQuiz`）。
   **農場**：19 格＝島上展示 6 隻、裝飾 12 格；小屋 6（擴建 +3 × 2）。「第二圈土地」只能買一次（80 🪙 + 60 🪵 + 40 🧱，完成一個單元後開放）→ 37 格＝展示 12、裝飾 24。再大就會亂，不加第三次。傳說寵物只靠成就。
6. **存檔相容**：改動 `GameState` 結構時，調升 `gameStore.ts` 的 `persist.version` 並更新 `migrate`。
7. **Hydration**：讀取 `gameStore` 的頁面要先用 `useHasHydrated()` 判斷。3D 世界用 `next/dynamic`（`ssr: false`）載入。
8. **選取**：島、建築、協作線、清單的點擊一律呼叫 `select()`，不要另存選取狀態。答題面板的開關存在 `uiStore.quiz`，首頁／島嶼／家長頁的切換存在 `uiStore.view`。
9. **單一路由**：不新增 `app/` 路由、不用 `next/link` 或 `router.push`。靜態主機可能把網站放在子路徑（例如 Claude artifact 的 `/_f/<版本>/`），只有單一 `index.html` 加相對資源路徑才能在任何地方跑。
10. **3D 實作注意**：

- 大量重複物件（小人）用 `InstancedMesh`，每幀在 `useFrame` 裡更新矩陣。
- drei `<Html>` 名牌一律掛載，以 `hidden` 切換顯示，並傳 `portal={labelLayer}`。
- 場景色票集中在 `components/scene/palette.ts`，與 `globals.css` 保持一致。
- 鏡頭動畫只在 `CameraRig` 裡處理；左側詳情卡與右側清單的寬度會傳進去讓鏡頭避開。

11. 優先用 Server Component；只有需要互動、store 或 WebGL 的元件才加 `"use client"`。

## 給小朋友用的介面規則

- 按鈕可點擊區域至少 44px，答題按鈕用 `.answer-button`（64px 高、大字）。
- 一次只出一題；答錯立刻顯示正解與一句中文解說，並朗讀正確的英文。
- 填空題作答前不能聽到含答案的句子（`QuizPanel` 已處理）；聽力題與拼字練習（dictation）開啟就自動唸一次。
- 語音一律由使用者動作觸發（iPad Safari 限制），不要在載入時自動播放。
- 不用 `window.alert` / `confirm` / `prompt`：artifact 的 iframe 會擋掉。要確認就在頁面上做兩段式按鈕（見 `ReportView` 的重設）。
- 農場只有好事：沒有飢餓懲罰、不扣東西、不計時；商店買不起時一定告訴小朋友「還差什麼、去哪座島賺」。
- 中文用台灣用語、國小程度；介面文字不出現「錯誤」「失敗」這類字眼。

## 內容撰寫規則

見 `docs/content-format.md`。重點：正確選項放 `options[0]`（遊戲會洗牌）、每題有 `tags`、文法題必有 `explain`、英文只用該課與之前學過的字、不發明課本沒有的內容。

## 部署

兩條路，內容與程式完全相同：

- **Cloudflare Pages**（長期）：`npm run build` 產生 `out/`，build command `npm run build`、output `out`。網址公開，上線後用 Cloudflare Access 或簡單 PIN 擋一下。
- **Claude artifact**（隨手試玩、iPad 立刻開）：`npm run build:artifact`（相對資源路徑 `./assets`），再把 `out/` 發佈成 artifact 檔案：`_next/**` 對應到 `assets/_next/**`，根目錄 `_` 開頭的檔案（`__next.*.txt`、`_not-found/`）不上傳（伺服器保留 `_` 前綴）。artifact 的 slug 記在 `docs/deploy.md`。

無後端、無帳號、不收集個資；進度在裝置的 localStorage。

## 實作進度

- [x] 內容模型與 Unit 3（People in Town）11 棟 95 題
- [x] 一單元三島的場景配置、建築亮燈與星星
- [x] 答題面板六種題型、英文朗讀、錯題袋
- [x] 家長頁（星數、挑戰次數、錯題、最常錯的 tag、農場）
- [x] 獎勵機制：金幣與材料、每日上限、里程碑、農場島（寵物、商店、圖鑑、裝飾）
- [x] 拼字練習（聽寫）、每題對錯統計、複習島（常錯題優先，三島全亮才開放）、家長頁常錯題
- [ ] 錯題袋提醒（今天有幾題到期）與「每日任務」
- [ ] 口說題（語音辨識比對）
- [ ] 多位小朋友的存檔切換
- [ ] 部署到 Cloudflare Pages 並加存取限制
