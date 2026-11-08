"use client";

import { UNITS, islandsOfUnit } from "@/content/islands";
import { ISLANDS } from "@/content/world";
import { islandMaxStars, islandStars, islandStatus, unitStatus } from "@/game/engine";
import { petsOutside } from "@/game/farm";
import { type Selection, select } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { KIND_LABELS } from "./DetailCard";

const STATUS_LABEL = { visited: "全亮", current: "開放中", locked: "未開放" };
const UNIT_LABEL = { done: "完成", current: "進行中", locked: "未開放" };
const BUILDING_COUNT = ISLANDS.reduce((n, i) => n + i.buildings.length, 0);

export function IndexPanel({ selection }: { selection: Selection }) {
  const game = useGameStore();
  const { panelOpen, toggle } = useUiStore();

  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => toggle("panelOpen")}
        className="glass-card absolute right-3 bottom-3 z-30 px-4 py-3 text-sm font-medium md:top-3 md:bottom-auto"
      >
        地圖清單
      </button>
    );
  }

  return (
    <aside className="glass-card absolute inset-x-3 bottom-3 z-30 flex max-h-[45vh] flex-col overflow-hidden md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:max-h-none md:w-[min(26rem,33vw)]">
      <header className="flex items-start justify-between gap-2 p-5 pb-3">
        <div>
          <p className="mono-label">ENGLISH ISLANDS</p>
          <h2 className="mt-1 text-2xl font-bold">英文島</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {UNITS.length} 個單元 / {ISLANDS.length} 座島 / {BUILDING_COUNT} 棟房子
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle("panelOpen")}
          className="icon-button"
          aria-label="收合清單"
        >
          ×
        </button>
      </header>
      <ol className="flex-1 overflow-y-auto p-3">
        <li className="mb-3">
          <button
            type="button"
            data-selected={selection?.kind === "farm"}
            onClick={() => select({ kind: "farm", id: "farm" })}
            className="list-row"
          >
            <span className="text-2xl" aria-hidden>
              🐔
            </span>
            <span className="flex-1">
              <span className="block font-medium">農場</span>
              <span className="text-xs text-neutral-500">
                {petsOutside(game.farm).length} 隻在島上・🪙 {game.farm.inventory.coin}
              </span>
            </span>
          </button>
        </li>
        {UNITS.map((unit, u) => {
          const status = unitStatus(game, u);
          return (
            <li key={unit.id} className="mb-3">
              <div className="flex items-center gap-3 px-2 py-1">
                <span className="index-number">{String(unit.number).padStart(2, "0")}</span>
                <span className="flex-1">
                  <span className="block font-medium">{unit.title}</span>
                  <span className="text-xs text-neutral-500">{unit.titleZh}</span>
                </span>
                <span data-status={status === "done" ? "visited" : status} className="status-pill">
                  {UNIT_LABEL[status]}
                </span>
              </div>
              <ul>
                {islandsOfUnit(unit).map((island) => {
                  const index = ISLANDS.indexOf(island);
                  const iStatus = islandStatus(game, index);
                  return (
                    <li key={island.id}>
                      <button
                        type="button"
                        data-selected={selection?.kind === "island" && selection.id === island.id}
                        onClick={() => select({ kind: "island", id: island.id })}
                        className="list-row pl-6"
                      >
                        <span className="flex-1">
                          <span className="block font-medium">{island.name}</span>
                          <span className="text-xs text-neutral-500">
                            {KIND_LABELS[island.kind]}・{island.buildings.length} 棟・★{" "}
                            {islandStars(game, island)}/{islandMaxStars(island)}
                          </span>
                        </span>
                        <span data-status={iStatus} className="status-pill">
                          {STATUS_LABEL[iStatus]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
