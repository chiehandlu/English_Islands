# EnglishIsland｜英文島

給國小四年級小朋友的英文練習遊戲（Jay 家私人使用，iPad Safari 為主）。畫面是一座可探索的 3D 等角群島：**一個課本單元＝三座相鄰的小島**（單字島、文法島、閱讀島）加一座**複習島**，島上的建築＝一個題組，答對題目建築就亮燈拿星（0–3 顆）；三座課程島全亮，下一個單元才開放、本單元的複習島也才開放。單字島的第 5 棟是自動產生的「拼字練習」（聽英文、拼出來）。答錯的題目進「錯題袋」，隔天再出；每題累計的對錯次數決定「常錯題」，複習島和拼字練習會優先出這些。每次挑戰賺金幣和材料，到**農場島**換寵物、餵食、蓋裝飾。

**正式網址：https://english-islands.pages.dev**（Cloudflare Pages，push `main` 自動部署）
**GitHub：https://github.com/chiehandlu/English_Islands**

引擎沿用 [BeAParent](https://github.com/chiehandlu/BeAParent)（Heart Island 機制），機制拆解見 `docs/reference/heart-island-spec.md`。**只參考機制與版面，不得沿用原站的品牌、標誌、人名與文字。**

@AGENTS.md

## 背景與發想（為什麼長這樣）

這份是給下一個對話／Claude Code 看的脈絡，省得重新問。

- **起點**：Jay 原本想做一個 iPad 私人家教 App，分國語、數學、自然、社會、英文五科（國語只要顯示字不用筆順；數學要一步步解題／證明、可用手寫筆、可暫停；自然與社會用動畫講解，當時定義了「分鏡格式」與「數學繪圖指令」兩份 JSON 規格）。後來討論出：**題目內容交給 Claude 專案產生，遊戲只負責呈現**，不需要一個真的 App。手寫筆互動是唯一還沒解的點，所以先從不用手寫的英文下手。
- **為什麼是英文、為什麼是島**：小朋友這一課的教材只有單字、文法、閱讀三塊，剛好對應三座島；之後每課照同樣模式長出新的一組島，不用改程式。Jay 之前做過 BeAParent（Heart Island 風格的 3D 群島），直接沿用引擎。
- **內容來源**：Jay 把小朋友的課本／評量整理成 MD，餵給一個叫「英文島」的 Claude 專案（指令全文在 `docs/claude-project-instructions.md`，格式文件 `docs/content-format.md` 放在專案知識），專案產出 `uNN.json`，丟進 `src/content/units/` 就是新一課。**改內容規則時，這兩份文件要一起改，而且要提醒 Jay 把新版貼回 Claude 專案。**
- **獎勵機制**：Jay 希望小朋友「為了農場反覆答題」，所以設計了金幣（看答對率）＋材料（看島×題型）＋農場島（寵物、裝飾、餵食、成長），每棟每天前 5 次全額（原本 3 次，Jay 在設計書上改成 5）。寵物數量有上限、農場只能付費擴建一次到 37 格，再大畫面會亂。設計書：`docs/reward-design.md`（Claude Doc 原稿：https://claude.ai/artifact/UWgvYbe5peXMW1u4QjiBnY ）。
- **拼字與複習**：小朋友拼字最弱，所以加了聽寫式拼字練習（遊戲唸英文、他拼）；並記錄每題對錯次數，做一座「複習島」專出常錯題，三座島全亮才開放——既是複習也是獎勵。
- **原則**：溫暖、不評斷，介面不出現「錯誤」「失敗」；農場只有好事；無後端、無帳號、不收個資。
- **試玩期**：Cloudflare 上線前，曾把靜態輸出發佈成 Claude artifact（https://claude.ai/artifact/VyvQ25WGXFSTJS39qdz7yZ ）讓 iPad 立刻能玩；因此程式被改成單一路由＋相對資源路徑（見架構規則 9）。現在以 Cloudflare 網址為主，artifact 不再更新。

## 技術選型

| 項目      | 選擇                                                                   | 備註                                                                            |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 框架      | Next.js 16（App Router）+ TypeScript strict，`output: "export"` 純靜態 | 版本與訓練資料不同，寫 Next 相關程式前先讀 `node_modules/next/dist/docs/`       |
| 3D        | three + React Three Fiber + drei                                       | 幾何一律程式化產生，不使用外部模型檔                                            |
| 樣式      | Tailwind CSS v4                                                        | 色票在 `src/app/globals.css` 的 `@theme`；共用元件 class 在 `@layer components` |
| 朗讀      | 瀏覽器 `speechSynthesis`（`src/lib/speech.ts`）                        | 英文 en-US、中文 zh-TW；不用任何 TTS API                                        |
| 音效      | Howler.js，經 `src/lib/audio.ts` 包裝                                  | 預設靜音                                                                        |
| 狀態      | Zustand：`gameStore`（persist 到 localStorage）、`uiStore`（不存檔）   | 無後端、無帳號                                                                  |
| 選取狀態  | URL hash（`#island=…` / `#building=…` / `#flow=…` / `#farm=farm`）     | `src/lib/selection.ts`                                                          |
| 測試      | Vitest                                                                 | 測 `src/game/`、`src/scene/` 純邏輯與 `src/content/` 內容規則                   |
| Lint/格式 | ESLint（eslint-config-next）+ Prettier（printWidth 100）               |                                                                                 |
| Node      | 22（`.node-version`）                                                  | Cloudflare 預設 Node 18 跑不動 Next 16                                          |

## 指令

```bash
npm run dev             # 開發伺服器
npm run build           # 靜態輸出到 out/（Cloudflare 用這個）
npm run build:artifact  # 同上但資源路徑相對（./assets），給子路徑主機用
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm test                # Vitest
npm run format          # Prettier
```

提交前必須通過：`npm run lint && npm run typecheck && npm test && npm run build`。

## 目錄結構

```
src/
  app/               # 只有一個路由 /；畫面由 uiStore.view 切換（home / play / report）
  components/
    App.tsx          # view 切換；StartCard（首頁）、ReportView（家長頁）
    scene/           # R3F 3D 元件：World、Islands、FarmIsland、Bridges、FlowArcs、Walkers、CameraRig、palette
    hud/             # 疊在 canvas 上的 DOM 介面：TopBar、IndexPanel、DetailCard、QuizPanel、FarmCard、RewardList
  game/              # 純 TS 遊戲規則：types、engine（星等／解鎖）、quiz（出題／判題）、
                     #   review（錯題袋、常錯統計、複習題組）、rewards（金幣／掉落／每日上限／里程碑）、
                     #   farm（領養／餵食／裝飾／上限）、dayClock
  scene/             # 純 TS 場景數學：六角座標、小人狀態機、燈光內插、farm（農場 19／37 格與寵物漫步）
  content/
    units/           # 內容資料：每單元一個 uNN.json；index.ts 列出所有單元
    farm.ts          # 農場圖鑑：寵物、裝飾、價格、掉落表（資料，改數字不用動程式）
    islands.ts       # 由 UNITS 推導 ISLANDS（編號、axial 位置、所屬單元），並自動加上拼字練習與複習島
    flows.ts         # 由單元自動推導協作線（單字→文法→閱讀→複習）
    world.ts         # 由資料推導場景配置
  store/             # Zustand store
  lib/               # 瀏覽器工具（朗讀、音效、URL 選取）
scripts/e2e/         # Playwright 端對端腳本（見「驗證方式」）
docs/
  content-format.md              # unit JSON 格式（也放進 Claude 專案知識）
  claude-project-instructions.md # Claude 專案「英文島」的指令全文
  reward-design.md               # 獎勵機制設計書（金幣、材料、農場、寵物、價格、可調參數）
  deploy.md                      # 部署紀錄（Cloudflare 專案、artifact slug）
  reference/                     # Heart Island 規格書
```

## 架構規則

1. **規則與畫面分離**：星等、解鎖、判題、錯題排程、獎勵計算寫在 `src/game/`；座標換算、小人移動、燈光計算、農場格子寫在 `src/scene/`。兩者都必須是無副作用的純函式並有測試。元件和 store 只呼叫它們，不自行計算。
2. **內容即資料**：新增單元只加 `src/content/units/uNN.json` 和 `index.ts` 一行，不改引擎與場景元件。島的位置由單元順序推導（`islands.ts` 的 `CLUSTER_OFFSETS` / `CLUSTER_STEP`），內容檔不寫座標。
3. **一單元三島＋複習島**：內容檔的 `kind` 固定 `vocab` / `grammar` / `reading` 各一；每島人寫的 1–4 棟（文法島、閱讀島兩邊有橋只剩 4 格；單字島第 5 格給拼字練習）。`content/islands.ts` 推導時自動加上：單字島第 5 棟 `uNN-spell`（`generated: "dictation"`，題目來自全單元 `cards`，`mode: "dictation"`）與第四座島 `uNN-review`（`kind: "review"`，三棟 `generated: "review"` 各對應一種 `reviewKind`，`questions` 為空，出題時由 `review.ts` 的 `reviewSet` 動態組）。單元完成（`unitComplete`）與全三星只看三座課程島（`coreIslandsOfUnit`）；複習島在單元完成前 `islandStatus` 為 `locked`。材料掉落照題目原本的島（`originKind`）。`content.test.ts` 會檢查。
4. **進度只存五樣**：`player`、`progress`（每棟 `stars`/`best`/`attempts`）、`mistakes`（錯題與下次複習日）、`questionStats`（每題累計 `wrong`/`right`/`lastWrong`）、`farm`（背包、寵物、裝飾、每日計數、已領里程碑）。島與單元的狀態一律由此推導。星星只升不降，農場的東西只進不出（拆裝飾退一半材料是唯一例外）。「常錯題」＝`troubleScore = wrong×2 − right > 0`，答對會慢慢抵銷。
5. **星等**：答對率 ≥ 0.9 三顆、≥ 0.7 兩顆、≥ 0.5 一顆；一顆星以上＝亮燈。改門檻只改 `engine.ts` 的 `starsForRatio` 與測試。
   **獎勵**：金幣 1/2/3、首次全對 +2、每棟每天前 5 次全額；材料每答對一題掉一個，依「島 × 題型」查 `content/farm.ts` 的 `dropFor`。數字都在 `rewards.ts` 的 `REWARD_CONFIG` 與 `farm.ts` 的 `FARM_CONFIG`。結算順序固定：`recordResult` → `applyRunRewards` → `claimMilestones`（`gameStore.finishQuiz`）。
   **農場**：19 格＝島上展示 6 隻、裝飾 12 格；小屋 6（擴建 +3 × 2）。「第二圈土地」只能買一次（80 🪙 + 60 🪵 + 40 🧱，完成一個單元後開放）→ 37 格＝展示 12、裝飾 24。再大就會亂，不加第三次。傳說寵物只靠成就。掉落固定不隨機；新手送一隻雞。
6. **存檔相容**：改動 `GameState` 結構時，調升 `gameStore.ts` 的 `persist.version`（目前 4）並更新 `migrate`。小朋友的進度在 iPad 的 localStorage 裡，弄壞 migrate 就等於清掉他的星星。
7. **Hydration**：讀取 `gameStore` 的頁面要先用 `useHasHydrated()` 判斷。3D 世界用 `next/dynamic`（`ssr: false`）載入。
8. **選取**：島、建築、協作線、清單的點擊一律呼叫 `select()`，不要另存選取狀態。答題面板的開關存在 `uiStore.quiz`，首頁／島嶼／家長頁的切換存在 `uiStore.view`。
9. **單一路由**：不新增 `app/` 路由、不用 `next/link` 或 `router.push`。靜態主機可能把網站放在子路徑（例如 Claude artifact 的 `/_f/<版本>/`），只有單一 `index.html` 加相對資源路徑才能在任何地方跑。
10. **3D 實作注意**：

- 大量重複物件（小人）用 `InstancedMesh`，每幀在 `useFrame` 裡更新矩陣。
- drei `<Html>` 名牌一律掛載，以 `hidden` 切換顯示，並傳 `portal={labelLayer}`；條件式卸載會在 React 19 丟 `removeChild` 錯誤。
- 場景色票集中在 `components/scene/palette.ts`，與 `globals.css` 保持一致（複習島是麥色 `grassReview`）。
- 鏡頭動畫只在 `CameraRig` 裡處理；左側詳情卡與右側清單的寬度會傳進去讓鏡頭避開；全景要含農場。
- 寵物用 emoji 畫成 CanvasTexture sprite，漫步由純函式 `scene/farm.ts` 的 `stepWander` 決定。

11. 優先用 Server Component；只有需要互動、store 或 WebGL 的元件才加 `"use client"`。

## 給小朋友用的介面規則

- 按鈕可點擊區域至少 44px，答題按鈕用 `.answer-button`（64px 高、大字）。
- 一次只出一題；答錯立刻顯示正解與一句中文解說，並朗讀正確的英文。
- 填空題作答前不能聽到含答案的句子（`QuizPanel` 已處理）；聽力題與拼字練習（dictation）開啟就自動唸一次。
- 語音一律由使用者動作觸發（iPad Safari 限制），不要在載入時自動播放。
- 不用 `window.alert` / `confirm` / `prompt`：artifact 的 iframe 會擋掉。要確認就在頁面上做兩段式按鈕（見 `ReportView` 的重設）。
- 連連看的 🔊 放在列尾（`flex justify-between`），不要放在文字中間，小朋友會誤點。
- 農場只有好事：沒有飢餓懲罰、不扣東西、不計時；商店買不起時一定告訴小朋友「還差什麼、去哪座島賺」。
- 中文用台灣用語、國小程度；介面文字不出現「錯誤」「失敗」這類字眼。

## 內容撰寫規則與新增單元流程

規則見 `docs/content-format.md`。重點：正確選項放 `options[0]`（遊戲會洗牌）、每題有 `tags`、文法題必有 `explain`、英文只用該課與之前學過的字、不發明課本沒有的內容、閱讀島每棟至少一題 match（鑰匙只從這裡來）、單字島每棟要有 `cards`（拼字練習靠它）。

新增一課的流程：

1. Jay 把課本／評量整理成 MD，丟進 Claude 專案「英文島」，請它產生 `uNN.json`（專案指令會要求先說明怎麼拆房子）。
2. 存成 `src/content/units/uNN.json`，在 `src/content/units/index.ts` 加一行。
3. `npm test`：`content.test.ts` 會抓 id 重複、棟數、題數、選項數、拼字字元、閱讀 match 等問題；修內容而不是改測試。
4. `npm run build` 確認過，commit、push `main`，Cloudflare 約 40 秒後上線。iPad 重新整理即可，舊存檔不受影響。

目前有 Unit 3「People in Town」（11 棟人寫）和 Unit 4「Getting Together」（12 棟人寫），各加 1 棟拼字練習＋複習島 3 棟。

## 部署

- **Cloudflare Pages（正式）**：專案 `english-islands`，接 GitHub `English_Islands` 的 `main`。Framework preset = Next.js (Static HTML Export)，build `npx next build`，output `out`，環境變數 `NODE_VERSION=22`。其他分支會長出 preview 網址。網址目前公開、未加存取限制（Jay 說先不擋）。
- **Claude artifact（已停用的試玩版）**：`npm run build:artifact`，把 `out/` 以 `publish_files` 發佈：`_next/**` 對應到 `assets/_next/**`，根目錄 `_` 開頭的檔案（`__next.*.txt`、`_not-found/`）不上傳（伺服器保留 `_` 前綴）。slug 與版本記在 `docs/deploy.md`。

無後端、無帳號、不收集個資；進度在裝置的 localStorage。

## 驗證方式

- 單元測試：`npm test`（65 個測試：引擎、出題、錯題／常錯、獎勵、農場、場景幾何、內容規則）。
- 端對端：`scripts/e2e/review.py`（Playwright + headless Chrome，`BASE=<靜態主機網址> python3 scripts/e2e/review.py`）。會走完「拼字練習故意錯 3 題 → 點亮三座島 → 複習島開放 → 文法複習三星」，印出 localStorage 裡的 `questionStats`、`mistakes`、背包。headless 用 swiftshader 很慢，所以腳本用 `dispatch_event("click")`、藏起 canvas；同 prompt 的題目要用畫面上的選項／字卡去分辨。
- 真機：iPad Safari 開正式網址；語音要實際點一下才會響。

## 進度

- [x] 內容模型與 Unit 3（People in Town）
- [x] 一單元三島的場景配置、建築亮燈與星星
- [x] 答題面板六種題型（choice / listen / spell / match / order / yesno）、英文朗讀、錯題袋（間隔重複）
- [x] 家長頁（星數、挑戰次數、錯題、最常錯的 tag、常錯題、農場、重設）
- [x] 獎勵機制：金幣與材料、每日上限、里程碑、農場島（寵物、商店、圖鑑、裝飾、餵食成長、第二圈土地）
- [x] 拼字練習（聽寫）、每題對錯統計、複習島（常錯題優先，三島全亮才開放）
- [x] 部署到 Cloudflare Pages，push 自動更新

## Backlog 與發想（還沒做，照 Jay 提過的順序）

- **存取限制**：Cloudflare Access（Google 登入，較嚴）或首頁簡單 PIN（存在裝置）。Jay 目前選「先不擋」。
- **錯題袋提醒**：TopBar 顯示今天到期幾題；可加「每日任務」（例如今天完成三座島各一棟＋錯題袋）配合現有的 `dailyAllIslands` 獎勵。
- **口說題**：Web Speech 語音辨識比對；iPad Safari 的支援度要先驗證。
- **多位小朋友的存檔切換**：家裡還有一個幼兒園大班的，之後可能要用；存檔 key 加 profile 前綴即可，`gameStore` persist name 目前是 `english-island-save`。
- **效能與低階機**：減少小人、關閉陰影；目前 iPad 上順，暫不處理。
- **更多單元**：Unit 1、2、4… 照流程加；島會自動往右下長（`CLUSTER_STEP`）。
- **更大的藍圖**（原始構想，尚未開工）：其他科目也走「Claude 專案產內容 → 遊戲呈現」。自然／社會用分鏡 JSON 驅動動畫講解＋追問；數學要逐步解題／證明、停頓、手寫筆作答（手寫辨識是最大未知）；國語顯示字詞不做筆順。若要做，另開 repo 或在本 repo 加 `subject` 維度，不要把英文島的 content 型別撐大。

## 踩過的坑（別再踩）

- Next 16 的型別在第一次 `next build` 後才生成（`LayoutProps`），先 build 再 typecheck。
- ESLint `react-hooks/set-state-in-effect`：結果記錄放在 `next()` 的轉場裡，不要在 effect 裡 setState；題型元件不要條件式呼叫 hook，改傳已窄化的 `q`。
- 最後一題的回饋要用 `session.items[session.index - 1]`，不然 index 已經超出。
- Claude artifact 主機保留根目錄 `_` 前綴，且頁面在子路徑下；因此有 `ASSET_PREFIX=./assets`、單一路由、相對路徑的設計。
- Cloudflare Pages 預設 Node 18 → Next 16 會炸，`.node-version`＋`NODE_VERSION` 都設 22。新專案的 `*.pages.dev` 剛建好前一分鐘會 522，等一下再開。
- Prettier 會重排程式碼，用腳本做字串取代前先看實際文字。
- GameState 加欄位忘了進 `pickState`／`migrate`，存檔就會缺欄位而當掉。

## 工作慣例

- Commit 以 Jay 的名義：`git -c user.name="Jay" -c user.email="chiehandlu@gmail.com" commit`，訊息用繁體中文、條列改了什麼；結尾附 `Co-Authored-By: Claude …` 與 `Claude-Session: …`。
- 提交前跑 `npm run format && npm run lint && npm run typecheck && npm test && npm run build`。
- 改了內容規則（棟數、題型、欄位）就同步改 `docs/content-format.md`、`docs/claude-project-instructions.md`，並在回覆裡提醒 Jay 更新 Claude 專案。
- 改了獎勵數字就同步改 `docs/reward-design.md`。
- 對 Jay 說明時用繁體中文、台灣用語，先講結果再講細節；他在手機上看，別太長。
