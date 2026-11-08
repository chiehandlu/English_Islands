# 英文島 單元內容格式（unit JSON）v1

一個課本單元＝一個 `src/content/units/uNN.json`。遊戲程式只讀這份資料；新增單元不用改程式，只要：

1. 把 `uNN.json` 放進 `src/content/units/`
2. 在 `src/content/units/index.ts` 加一行 `import uNN from "./uNN.json";` 並加進 `UNITS` 陣列
3. `npm test` 會自動檢查格式規則（見最後一節）

## 結構總覽

```
Unit（單元）
└── islands[3]（固定三座島：vocab 單字、grammar 文法、reading 閱讀）
    └── buildings[1–5]（建築＝一個題組／學習重點）
        ├── cards[]（可點來聽的單字或句子）
        ├── notes[]（文法重點，條列）
        ├── passage[]（閱讀短文，一行一句）
        └── questions[5–12]（題目，六種題型）
```

## Unit

```json
{
  "id": "u03",
  "number": 3,
  "title": "People in Town",
  "titleZh": "小鎮上的人",
  "islands": [ … ]
}
```

| 欄位    | 說明                                                          |
| ------- | ------------------------------------------------------------- |
| id      | `u` + 兩位數單元號，例如 `u03`、`u10`。所有 id 都用這個當前綴 |
| number  | 課本上的單元號                                                |
| title   | 課本英文標題                                                  |
| titleZh | 中文標題，自己取，6 字以內                                    |

## Island

```json
{ "id": "u03-vocab", "kind": "vocab", "name": "單字島", "buildings": [ … ] }
```

`kind` 固定三種：`vocab`、`grammar`、`reading`，一個單元各一座，順序也固定。`id` 用 `單元id-kind`。

## Building

```json
{
  "id": "u03-g1",
  "name": "動詞加 s",
  "emoji": "✏️",
  "intro": "說「他、她、某一個人」做什麼的時候，動詞後面要加 s。",
  "notes": ["主詞是 he、she、it 時動詞加 s", "fly → flies", "have → has"],
  "cards": [{ "en": "works", "zh": "工作" }],
  "passage": ["Matt is sick. He has a cold."],
  "questions": [ … ]
}
```

| 欄位      | 必填 | 說明                                                 |
| --------- | ---- | ---------------------------------------------------- |
| id        | 是   | 單字島 `uNN-v1`…、文法島 `uNN-g1`…、閱讀島 `uNN-r1`… |
| name      | 是   | 8 字以內，顯示在房子名牌上                           |
| emoji     | 是   | 一個 emoji，當房子的圖示                             |
| intro     | 是   | 一句話說這棟要學什麼，國小程度的中文                 |
| notes     | 否   | 文法重點條列，每條 30 字以內。文法島必填             |
| cards     | 否   | 可點來聽的字卡。單字島必填；`say` 省略時唸 `en`      |
| passage   | 否   | 閱讀短文，一行一句，每句可單獨點來聽。閱讀島必填     |
| questions | 是   | 5 到 12 題，至少兩種題型                             |

建築怎麼拆：單字島依「主題」拆（職業、工作內容、生病…），文法島依「句型／規則」拆（動詞加 s、Does 問句…），閱讀島依「課文／短文」拆。一座島 1 到 5 棟（六角島只有這麼多格）。

## Question 六種題型

所有題目共用：`id`（`建築id-qN`）、`tags`（學習重點標籤，錯題分析用，例如 `3sg-s`、`jobs`、`how-much`）、`explain`（答錯時顯示並朗讀的中文解說，一句、60 字以內，文法題務必寫）。

### choice 選擇

```json
{
  "id": "u03-g1-q1",
  "type": "choice",
  "prompt": "The pilot ______ planes.",
  "say": "The pilot flies planes.",
  "options": ["flies", "fly", "flys"],
  "answer": 0,
  "explain": "主詞是一個人，fly 字尾 y 要去 y 加 ies。",
  "tags": ["3sg-s"]
}
```

- `prompt` 可以是英文句子或中文問題（「獸醫」的英文是？）。
- `say` 是朗讀用的完整英文句子；填空題的 `say` 含答案，遊戲會在作答後才播放。
- **`answer` 一律填 0，把正確選項放第一個**，遊戲會自動洗牌。2 到 4 個選項，不可重複。

### listen 聽力

```json
{
  "id": "u03-v1-q1",
  "type": "listen",
  "say": "librarian",
  "prompt": "聽聽看，這是誰？",
  "options": ["圖書館員", "收銀員", "服務生"],
  "answer": 0,
  "tags": ["jobs"]
}
```

遊戲會先唸 `say`（英文），小朋友再選。`prompt` 是中文指示。選項可以是中文或英文。

### spell 拼字

```json
{
  "id": "u03-v1-q8",
  "type": "spell",
  "prompt": "收銀員",
  "say": "cashier",
  "answer": "cashier",
  "explain": "cashier 中間是 sh。",
  "tags": ["spelling"]
}
```

`answer` 只用小寫英文字母、空格和 `'`，去掉空格後 14 個字元以內。遊戲會給字母磚（答案字母加三個干擾字母）。

### match 配對

```json
{
  "id": "u03-v1-q5",
  "type": "match",
  "prompt": "把工作和地點連起來",
  "pairs": [
    ["cashier", "supermarket"],
    ["vet", "animal hospital"]
  ],
  "tags": ["jobs"]
}
```

2 到 5 對；右欄文字不可重複。左欄是英文時會有 🔊 可以聽。

### order 句子重組

```json
{
  "id": "u03-g1-q7",
  "type": "order",
  "prompt": "把字排成句子：廚師做食物。",
  "tokens": ["The", "cook", "makes", "food."],
  "answer": "The cook makes food.",
  "tags": ["order"]
}
```

`tokens` 用空格接起來必須等於 `answer`；標點黏在最後一個字上。3 到 8 個字。

### yesno 是非

```json
{
  "id": "u03-r1-q1",
  "type": "yesno",
  "prompt": "It's Emma's birthday.",
  "say": "It's Emma's birthday.",
  "answer": false,
  "explain": "是媽媽的生日。",
  "tags": ["reading"]
}
```

主要給閱讀島用，配合 `passage`。

## 出題比例建議（每棟 8 到 10 題）

| 島     | 題型組合                                                         |
| ------ | ---------------------------------------------------------------- |
| 單字島 | listen 2–3、choice（中翻英）2、match 1、spell 2、choice（句子）1 |
| 文法島 | choice（填空）4–5、order 2、match 或 listen 1                    |
| 閱讀島 | yesno 3–4、choice（理解）3、match 1                              |

答錯的題目會進錯題袋，隔天再出現；`tags` 讓家長頁統計最常錯的重點，所以同一個觀念要用同一個 tag。

## `npm test` 會檢查的規則

- 所有 id 不重複
- 每個單元剛好三座島、kind 各一
- 每座島 1 到 5 棟
- 每棟 5 到 12 題、至少兩種題型、有 intro 和 emoji
- choice / listen：2 到 4 個選項、不重複、answer 在範圍內
- spell：小寫字母、14 字元以內
- order：tokens 接起來等於 answer
- match：2 到 5 對、右欄不重複
- 閱讀島每棟至少一題 match（農場的鑰匙只從這裡來）
- explain 60 字以內
