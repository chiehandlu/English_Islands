"use client";

import { Stars } from "@/components/hud/Stars";
import { ItemChips } from "@/components/hud/RewardList";
import { PET_KINDS, getPetKind } from "@/content/farm";
import { STAGE_LABELS, petStage } from "@/game/farm";
import { UNITS, findQuestion, islandsOfUnit } from "@/content/islands";
import { maxTotalStars, progressOf, totalStars, unitStatus } from "@/game/engine";
import { useState } from "react";
import { useGameStore, useHasHydrated } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";

const KIND = { vocab: "單字", grammar: "文法", reading: "閱讀" } as const;

/** 家長頁：每棟的星數與挑戰次數、錯題袋內容、重設。 */
export function ReportView() {
  const hydrated = useHasHydrated();
  const game = useGameStore();
  const setView = useUiStore((s) => s.setView);
  const [armed, setArmed] = useState(false);
  if (!hydrated) return null;

  const tagCounts: Record<string, number> = {};
  for (const m of game.mistakes) {
    for (const tag of findQuestion(m.questionId)?.question.tags ?? [])
      tagCounts[tag] = (tagCounts[tag] ?? 0) + m.wrongCount;
  }
  const weakTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="mono-label">PARENT REPORT</p>
          <h1 className="text-3xl font-bold">
            {game.player.avatar} {game.player.name || "小朋友"}的學習紀錄
          </h1>
        </div>
        <button type="button" onClick={() => setView("play")} className="btn-primary">
          回到島上
        </button>
      </header>

      <section className="glass-card p-5">
        <p className="text-lg">
          總星數 <span className="text-amber-400">★</span> <b>{totalStars(game)}</b> /{" "}
          {maxTotalStars()}
          ・錯題袋 <b>{game.mistakes.length}</b> 題
        </p>
        {weakTags.length > 0 && (
          <p className="mt-2 text-sm text-neutral-600">
            最常錯的重點：{weakTags.map(([tag, n]) => `${tag}（${n}）`).join("、")}
          </p>
        )}
      </section>

      <section className="glass-card p-5">
        <p className="mono-label">農場</p>
        <p className="mt-2 text-sm">
          累計賺到 🪙 {game.farm.lifetimeCoins}・現在有{" "}
          <ItemChips items={game.farm.inventory} size="sm" />
        </p>
        <p className="mt-2 text-sm">
          寵物 {game.farm.pets.length} 隻（圖鑑 {new Set(game.farm.pets.map((p) => p.kind)).size} /{" "}
          {PET_KINDS.length}）：
          {game.farm.pets.map((p) => {
            const kind = getPetKind(p.kind);
            return (
              <span key={p.id} className="ml-2 whitespace-nowrap">
                {kind?.emoji} {p.name}（{STAGE_LABELS[petStage(p.growth)]}）
              </span>
            );
          })}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          最近 7 天挑戰次數：
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return (
              <span key={key} className="ml-2 tabular-nums">
                {key.slice(5)}：{game.farm.runsHistory[key] ?? 0}
              </span>
            );
          })}
          ・連續 {game.farm.streak.days} 天
        </p>
      </section>

      {UNITS.map((unit, u) => (
        <section key={unit.id} className="space-y-3">
          <h2 className="text-xl font-bold">
            Unit {unit.number} {unit.title}
            <span className="ml-2 text-sm font-normal text-neutral-500">
              {unit.titleZh}・
              {{ done: "完成", current: "進行中", locked: "未開放" }[unitStatus(game, u)]}
            </span>
          </h2>
          {islandsOfUnit(unit).map((island) => (
            <div key={island.id} className="glass-card p-4">
              <p className="mono-label">{KIND[island.kind]}島</p>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {island.buildings.map((b) => {
                    const p = progressOf(game, b.id);
                    const wrong = game.mistakes.filter((m) => m.buildingId === b.id).length;
                    return (
                      <tr key={b.id} className="border-t border-neutral-200/70">
                        <td className="py-2">
                          {b.emoji} {b.name}
                        </td>
                        <td className="py-2">
                          <Stars value={p.stars} />
                        </td>
                        <td className="py-2 text-neutral-500">
                          {p.attempts > 0
                            ? `${p.attempts} 次・最佳 ${Math.round(p.best * 100)}%`
                            : "還沒挑戰"}
                        </td>
                        <td className="py-2 text-right text-neutral-500">
                          {wrong > 0 ? `錯題 ${wrong}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}

      {game.mistakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">錯題袋</h2>
          <ul className="glass-card divide-y divide-neutral-200/70 p-4">
            {game.mistakes.map((m) => {
              const found = findQuestion(m.questionId);
              if (!found) return null;
              const q = found.question;
              const text = "prompt" in q && q.prompt ? q.prompt : "say" in q ? q.say : q.id;
              return (
                <li key={m.questionId} className="flex items-start gap-3 py-2 text-sm">
                  <span className="flex-1">
                    <span className="block">{text}</span>
                    <span className="text-xs text-neutral-500">
                      {found.building.emoji} {found.building.name}・錯 {m.wrongCount} 次・
                      {m.dueDate} 再出
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="text-center">
        {/* 不用 window.confirm：artifact 的 iframe 會擋掉；改成按兩次 */}
        {armed ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-rose-700">會清掉所有星星、錯題和農場，確定？</span>
            <button
              type="button"
              onClick={() => {
                game.reset();
                setArmed(false);
              }}
              className="chip border-rose-300 text-rose-700"
            >
              確定重設
            </button>
            <button type="button" onClick={() => setArmed(false)} className="chip">
              取消
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setArmed(true)} className="chip text-neutral-500">
            重設進度
          </button>
        )}
      </section>
    </main>
  );
}
