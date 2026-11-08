"use client";

import { CARRY_LABELS, WALKER_LABELS, flowIslands, flowsForIsland, getFlow } from "@/content/flows";
import { findBuilding, getIsland, questionsOfKind, unitOfIsland } from "@/content/islands";
import { ISLANDS } from "@/content/world";
import { ITEM_META } from "@/content/farm";
import { islandComplete, islandStatus, progressOf, starsOf } from "@/game/engine";
import { frequentlyWrong, mistakeCountByBuilding, reviewSet, toDateString } from "@/game/review";
import { dropsForBuilding, runsLeftToday } from "@/game/rewards";
import type { Building, Flow, Island } from "@/game/types";
import { type Selection, select } from "@/lib/selection";
import { speakEnglish } from "@/lib/speech";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { FLOW_COLORS } from "../scene/palette";
import { FarmCard } from "./FarmCard";
import { Stars } from "./Stars";

export const KIND_LABELS = {
  vocab: "單字",
  grammar: "文法",
  reading: "閱讀",
  review: "複習",
} as const;

/** 左側詳情卡：依選取顯示島／建築／協作線三種樣式。 */
export function DetailCard({ selection }: { selection: Selection }) {
  let body: React.ReactNode = null;
  if (selection?.kind === "island") {
    const island = getIsland(selection.id);
    if (island) body = <IslandCard island={island} />;
  } else if (selection?.kind === "building") {
    const found = findBuilding(selection.id);
    if (found) body = <BuildingCard island={found.island} building={found.building} />;
  } else if (selection?.kind === "flow") {
    const flow = getFlow(selection.id);
    if (flow) body = <FlowCard flow={flow} />;
  } else if (selection?.kind === "farm") {
    body = <FarmCard />;
  }
  if (!body) return null;

  return (
    <section className="glass-card absolute top-24 left-3 z-40 max-h-[calc(100%-7rem)] w-[min(24rem,calc(100%-1.5rem))] overflow-y-auto p-5 max-md:top-auto max-md:bottom-3 max-md:max-h-[62vh]">
      <button
        type="button"
        onClick={() => select(null)}
        className="icon-button float-right"
        aria-label="關閉"
      >
        ×
      </button>
      {body}
    </section>
  );
}

function FlowChips({ flows }: { flows: Flow[] }) {
  if (flows.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mono-label">小人的路線</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {flows.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => select({ kind: "flow", id: f.id })}
            className="chip"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: FLOW_COLORS[f.id] }} />
            {f.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function IslandCard({ island }: { island: Island }) {
  const game = useGameStore();
  const index = ISLANDS.indexOf(island);
  const status = islandStatus(game, index);
  const unit = unitOfIsland(island);
  const lit = island.buildings.filter((b) => starsOf(game, b.id) > 0).length;
  const mistakes = mistakeCountByBuilding(game);

  return (
    <article>
      <p className="mono-label">
        UNIT {unit.number}・{unit.title}
      </p>
      <h2 className="mt-1 text-2xl font-bold">
        {island.name}
        <span className="ml-2 align-middle text-sm font-normal text-neutral-500">
          {unit.titleZh}
        </span>
      </h2>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="tag">{KIND_LABELS[island.kind]}</span>
        <span className="tag">
          {lit} / {island.buildings.length} 棟亮燈
        </span>
        {islandComplete(game, island) && (
          <span className="tag bg-amber-100 text-amber-800">全亮 ✨</span>
        )}
      </div>

      {status === "locked" ? (
        <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">
          {island.kind === "review"
            ? "把這個單元的單字島、文法島、閱讀島都點亮，複習島就會開放。"
            : "這座島還沒開放。把前一個單元的三座島都點亮，就會浮出來。"}
        </p>
      ) : island.kind === "review" ? (
        <p className="mt-4 text-sm text-neutral-600">
          這裡專門出你之前常答錯的題目，答對幾次它們就不會再排在前面。材料照題目原本的島算。
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-600">
          點一棟房子開始挑戰，答對一半以上房子就會亮燈。
        </p>
      )}

      <ul className="mt-3 divide-y divide-neutral-200/70">
        {island.buildings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => select({ kind: "building", id: b.id })}
              className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
            >
              <span className="text-2xl" aria-hidden>
                {b.emoji}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{b.name}</span>
                {mistakes[b.id] ? (
                  <span className="text-xs text-neutral-500">錯題袋 {mistakes[b.id]} 題</span>
                ) : null}
              </span>
              <Stars value={starsOf(game, b.id)} />
              <span aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
      <FlowChips flows={flowsForIsland(island.id)} />
    </article>
  );
}

function BuildingCard({ island, building }: { island: Island; building: Building }) {
  const game = useGameStore();
  const openQuiz = useUiStore((s) => s.openQuiz);
  const status = islandStatus(game, ISLANDS.indexOf(island));
  const progress = progressOf(game, building.id);
  const open = status !== "locked";
  const today = toDateString(new Date());
  const runsLeft = runsLeftToday(game.farm, building.id, today);

  // 複習島：題目來自原本的島，數量與常錯題數每天不同
  const review =
    building.generated === "review" && building.reviewKind
      ? reviewSet(game, unitOfIsland(island), building.reviewKind, today)
      : null;
  const questionCount = review ? review.questions.length : building.questions.length;
  const dropKind = review ? building.reviewKind! : island.kind;
  const dropTypes = (
    review ? questionsOfKind(unitOfIsland(island), building.reviewKind!) : building.questions
  ).map((q) => q.type);
  const drops = dropsForBuilding(dropKind, dropTypes);
  // 常錯題：複習島用 reviewSet 算；拼字練習顯示常拼錯的字
  const trouble = review
    ? review.questions.slice(0, review.troubleCount)
    : building.generated === "dictation"
      ? frequentlyWrong(game, building.questions).slice(0, 5)
      : [];

  return (
    <article>
      <button
        type="button"
        onClick={() => select({ kind: "island", id: island.id })}
        className="mono-label hover:underline"
      >
        {String(island.number).padStart(2, "0")} {island.name} ›
      </button>
      <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
        <span aria-hidden>{building.emoji}</span>
        {building.name}
      </h2>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <Stars value={progress.stars} />
        {progress.attempts > 0 && (
          <span className="text-neutral-500">
            挑戰 {progress.attempts} 次・最佳 {Math.round(progress.best * 100)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-neutral-700">{building.intro}</p>

      {(review || building.generated === "dictation") && (
        <div className="mt-3 rounded-xl bg-sand/40 p-3 text-sm text-neutral-700">
          {trouble.length === 0 ? (
            <p>
              {review
                ? "目前沒有常答錯的題目，這次會從這種島隨機出題。"
                : "還沒有常拼錯的字，先來聽聽看、拼拼看。"}
            </p>
          ) : (
            <>
              <p className="mono-label">
                {review ? `常答錯的 ${trouble.length} 題會先出` : "常拼錯的字會先出"}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {trouble.map((q) => (
                  <li key={q.id} className="rounded-lg bg-white px-2 py-1 text-xs">
                    {(q.prompt ?? (q.type === "listen" ? `🔊 ${q.say}` : "")).slice(0, 18)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {building.notes && building.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 rounded-xl bg-sand/40 p-3 pl-7 text-sm text-neutral-700">
          {building.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {building.cards && building.cards.length > 0 && (
        <div className="mt-4">
          <p className="mono-label">點一下聽發音</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {building.cards.map((c) => (
              <button
                key={c.en}
                type="button"
                onClick={() => speakEnglish(c.say ?? c.en)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left hover:border-accent"
              >
                <span className="block font-medium">{c.en}</span>
                <span className="text-xs text-neutral-500">{c.zh}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {building.passage && building.passage.length > 0 && (
        <div className="mt-4">
          <p className="mono-label">點一句聽一句</p>
          <ol className="mt-2 space-y-1">
            {building.passage.map((line, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => speakEnglish(line)}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-sand/40"
                >
                  <span className="mr-2 text-neutral-400">🔊</span>
                  {line}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => speakEnglish(building.passage!.join(" "))}
            className="chip mt-2"
          >
            🔊 整段聽一次
          </button>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs text-neutral-500">
          這棟會掉：
          {drops.map((d) => (
            <span key={d} className="ml-1">
              {ITEM_META[d].emoji} {ITEM_META[d].name}
            </span>
          ))}
          <span className="ml-2">・今天還有 {runsLeft} 次全額</span>
        </p>
        {open ? (
          <button
            type="button"
            className="btn-primary w-full text-lg"
            onClick={() => openQuiz({ kind: "building", buildingId: building.id })}
          >
            {progress.stars === 0 ? "開始挑戰" : "再挑戰一次"}・{questionCount} 題
          </button>
        ) : (
          <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">
            {island.kind === "review"
              ? "把這個單元的三座島都點亮，就可以來複習。"
              : "這座島開放後才能挑戰。"}
          </p>
        )}
      </div>
    </article>
  );
}

function FlowCard({ flow }: { flow: Flow }) {
  const islands = flowIslands(flow).map((id) => getIsland(id)!);
  const names = (ids: string[]) => ids.map((id) => getIsland(id)?.name).join("、");
  return (
    <article>
      <span className="flow-badge" style={{ background: FLOW_COLORS[flow.id] }}>
        →
      </span>
      <h2 className="mt-2 text-2xl font-bold">{flow.title}</h2>
      <p className="mt-2 text-neutral-700">{flow.description}</p>
      <p className="mt-3 text-sm">
        {names(flow.from)} {flow.bidirectional ? "⇄" : "→"} {names(flow.to)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-sand/40 p-3">
          <p className="mono-label">搬的東西</p>
          <p className="mt-1 font-medium">{CARRY_LABELS[flow.carry]}</p>
        </div>
        <div className="rounded-xl bg-sand/40 p-3">
          <p className="mono-label">誰在搬</p>
          <p className="mt-1 font-medium">{WALKER_LABELS[flow.walker]}</p>
        </div>
      </div>
      <p className="mono-label mt-4">經過的島</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {islands.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => select({ kind: "island", id: i.id })}
            className="chip"
          >
            {String(i.number).padStart(2, "0")} {i.name}
          </button>
        ))}
      </div>
    </article>
  );
}
