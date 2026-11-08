"use client";

import { useState } from "react";
import {
  ACHIEVEMENT_LABELS,
  DECOR_KINDS,
  ITEM_IDS,
  ITEM_META,
  PET_KINDS,
  TIER_LABELS,
  getDecorKind,
  getPetKind,
} from "@/content/farm";
import { ISLANDS } from "@/content/islands";
import { islandStatus } from "@/game/engine";
import {
  FARM_CONFIG,
  STAGE_LABELS,
  barnCapacity,
  countDecor,
  fedToday,
  freeDecorSlot,
  growthToNext,
  hasDecor,
  missingFor,
  petCapacity,
  petStage,
  petsInBarn,
  petsOutside,
} from "@/game/farm";
import { toDateString } from "@/game/review";
import type { FeedItem, Inventory, IslandKind, ItemId, OwnedPet, PetKind } from "@/game/types";
import { select } from "@/lib/selection";
import { useGameStore } from "@/store/gameStore";

type Tab = "pets" | "shop" | "dex";

/** 農場卡：寵物、商店、圖鑑。 */
export function FarmCard() {
  const [tab, setTab] = useState<Tab>("pets");
  const farm = useGameStore((s) => s.farm);
  return (
    <article>
      <p className="mono-label">FARM</p>
      <h2 className="mt-1 text-2xl font-bold">🐔 農場</h2>
      <p className="mt-1 text-sm text-neutral-500">
        島上 {petsOutside(farm).length} / {FARM_CONFIG.displaySlots}・小屋 {petsInBarn(farm).length}{" "}
        / {barnCapacity(farm)}・裝飾 {farm.decor.filter((d) => d.slot !== null).length} /{" "}
        {FARM_CONFIG.decorSlots}
      </p>
      <div role="tablist" className="mt-3 flex gap-1">
        {(
          [
            ["pets", "寵物"],
            ["shop", "商店"],
            ["dex", "圖鑑"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className="tab"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "pets" && <PetsTab />}
        {tab === "shop" && <ShopTab />}
        {tab === "dex" && <DexTab />}
      </div>
    </article>
  );
}

function PriceChips({ price, inventory }: { price: Partial<Inventory>; inventory: Inventory }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ITEM_IDS.filter((id) => (price[id] ?? 0) > 0).map((id) => {
        const enough = inventory[id] >= (price[id] ?? 0);
        return (
          <span
            key={id}
            data-ok={enough}
            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs tabular-nums data-[ok=false]:bg-rose-100 data-[ok=false]:text-rose-700 data-[ok=true]:bg-lime-100 data-[ok=true]:text-lime-800"
          >
            {ITEM_META[id].emoji} {price[id]}
          </span>
        );
      })}
    </span>
  );
}

/** 「去閱讀島」：挑第一座開放中、還沒全亮的那種島。 */
function GoEarn({ missing }: { missing: Partial<Inventory> }) {
  const game = useGameStore();
  const kinds = new Set<IslandKind>();
  for (const id of Object.keys(missing) as ItemId[]) {
    const island = ITEM_META[id].island;
    if (island) kinds.add(island);
  }
  const targets = [...kinds]
    .map((kind) => {
      const open = ISLANDS.filter(
        (i, idx) => i.kind === kind && islandStatus(game, idx) !== "locked",
      );
      return open.find((i) => islandStatus(game, ISLANDS.indexOf(i)) === "current") ?? open.at(-1);
    })
    .filter(Boolean);
  if (targets.length === 0 && (missing.coin ?? 0) > 0)
    return <span className="text-xs text-neutral-500">金幣：任何一座島挑戰都有</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {targets.map((island) => (
        <button
          key={island!.id}
          type="button"
          onClick={() => select({ kind: "island", id: island!.id })}
          className="chip min-h-8 px-2 text-xs"
        >
          去{island!.name} ›
        </button>
      ))}
    </span>
  );
}

function PetsTab() {
  const game = useGameStore();
  const farm = game.farm;
  const today = toDateString(new Date());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const sorted = [...farm.pets].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));

  if (farm.pets.length === 0)
    return <p className="text-sm text-neutral-600">還沒有寵物，到商店看看。</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        飼料：🌾 {farm.inventory.grain}・🥕 {farm.inventory.veg}。每隻每天最多餵{" "}
        {FARM_CONFIG.feedPerDay} 份，愛吃的長兩格。
      </p>
      {sorted.map((pet) => {
        const kind = getPetKind(pet.kind);
        if (!kind) return null;
        const stage = petStage(pet.growth);
        const fed = fedToday(pet, today);
        const toNext = growthToNext(pet.growth);
        const feedBtn = (item: FeedItem) => (
          <button
            key={item}
            type="button"
            disabled={farm.inventory[item] <= 0 || fed >= FARM_CONFIG.feedPerDay}
            onClick={() => game.feed(pet.id, item)}
            className="chip min-h-10 px-3 disabled:opacity-40"
          >
            餵 {ITEM_META[item].emoji}
            {kind.favorite === item && <span aria-label="愛吃">❤️</span>}
          </button>
        );
        return (
          <div key={pet.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <span
                className={
                  stage === "baby" ? "text-2xl" : stage === "teen" ? "text-3xl" : "text-4xl"
                }
              >
                {kind.emoji}
              </span>
              <div className="min-w-0 flex-1">
                {editing === pet.id ? (
                  <form
                    className="flex gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      game.rename(pet.id, draft);
                      setEditing(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      maxLength={8}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-28 rounded-lg border border-neutral-300 px-2 py-1"
                    />
                    <button type="submit" className="chip min-h-8 px-2 text-xs">
                      好
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(pet.id);
                      setDraft(pet.name);
                    }}
                    className="font-bold hover:underline"
                    title="改名字"
                  >
                    {pet.name} <span className="text-xs font-normal text-neutral-400">✎</span>
                  </button>
                )}
                <p className="text-xs text-neutral-500">
                  {STAGE_LABELS[stage]}
                  {stage === "adult" ? "・🏅" : `・再 ${toNext} 格長大`}・今天餵了 {fed} /{" "}
                  {FARM_CONFIG.feedPerDay}・{pet.slot === null ? "在小屋" : "在島上"}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-lime-500 transition-all"
                    style={{ width: `${Math.min(100, (pet.growth / FARM_CONFIG.adultAt) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["grain", "veg"] as const).map(feedBtn)}
              {pet.slot === null ? (
                <button
                  type="button"
                  onClick={() => game.sendOut(pet.id)}
                  disabled={petsOutside(farm).length >= FARM_CONFIG.displaySlots}
                  className="chip min-h-10 px-3 disabled:opacity-40"
                >
                  出去玩
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => game.sendHome(pet.id)}
                  disabled={petsInBarn(farm).length >= barnCapacity(farm)}
                  className="chip min-h-10 px-3 disabled:opacity-40"
                >
                  回小屋
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShopTab() {
  const game = useGameStore();
  const farm = game.farm;
  const inv = farm.inventory;
  const full = farm.pets.length >= petCapacity(farm);

  return (
    <div className="space-y-4">
      <section>
        <p className="mono-label">領養寵物</p>
        <ul className="mt-2 space-y-2">
          {PET_KINDS.filter((k) => k.price).map((kind) => {
            const missing = missingFor(inv, kind.price!);
            const needDecor = kind.requiresDecor && !hasDecor(farm, kind.requiresDecor);
            const decor = kind.requiresDecor ? getDecorKind(kind.requiresDecor) : undefined;
            const ok = !needDecor && Object.keys(missing).length === 0 && !full;
            const owned = farm.pets.filter((p) => p.kind === kind.id).length;
            return (
              <li key={kind.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{kind.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {kind.name}
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        {TIER_LABELS[kind.tier]}・愛吃 {ITEM_META[kind.favorite].emoji}
                        {owned > 0 && `・已有 ${owned}`}
                      </span>
                    </p>
                    <div className="mt-1">
                      <PriceChips price={kind.price!} inventory={inv} />
                    </div>
                    {needDecor && decor && (
                      <p className="mt-1 text-xs text-rose-700">
                        要先蓋 {decor.emoji} {decor.name}
                      </p>
                    )}
                    {!needDecor && Object.keys(missing).length > 0 && (
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-neutral-600">
                        還差
                        {ITEM_IDS.filter((id) => missing[id]).map((id) => (
                          <span key={id}>
                            {ITEM_META[id].emoji} {missing[id]}
                          </span>
                        ))}
                        <GoEarn missing={missing} />
                      </p>
                    )}
                    {full && <p className="mt-1 text-xs text-rose-700">農場滿了，先擴建小屋</p>}
                  </div>
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => game.adopt(kind.id)}
                    className="btn-primary min-h-10 px-4 py-2 disabled:opacity-30"
                  >
                    領養
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="mono-label">蓋裝飾（用文法島的材料）</p>
        <ul className="mt-2 space-y-2">
          {DECOR_KINDS.filter((d) => d.buyable).map((kind) => {
            const missing = missingFor(inv, kind.price);
            const count = countDecor(farm, kind.id);
            const maxed = kind.maxCount !== undefined && count >= kind.maxCount;
            const noSlot = kind.effect !== "barn_plus_3" && freeDecorSlot(farm) === null;
            const ok = Object.keys(missing).length === 0 && !maxed && !noSlot;
            const unlocks = kind.unlocksPet ? getPetKind(kind.unlocksPet) : undefined;
            return (
              <li
                key={kind.id}
                className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <span className="text-3xl">{kind.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {kind.name}
                    {count > 0 && (
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        已有 {count}
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <PriceChips price={kind.price} inventory={inv} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {kind.effect === "barn_plus_3" &&
                      `小屋容量 +${FARM_CONFIG.barnPerExpansion}，最多兩次`}
                    {kind.effect === "bell" && "點一下，所有寵物跳一下"}
                    {unlocks && `蓋了才能領養 ${unlocks.emoji} ${unlocks.name}`}
                  </p>
                  {Object.keys(missing).length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-neutral-600">
                      還差
                      {ITEM_IDS.filter((id) => missing[id]).map((id) => (
                        <span key={id}>
                          {ITEM_META[id].emoji} {missing[id]}
                        </span>
                      ))}
                      <GoEarn missing={missing} />
                    </p>
                  )}
                  {noSlot && <p className="mt-1 text-xs text-rose-700">外圈滿了，先拆一件</p>}
                </div>
                <button
                  type="button"
                  disabled={!ok}
                  onClick={() => game.build(kind.id)}
                  className="btn-primary min-h-10 px-4 py-2 disabled:opacity-30"
                >
                  {kind.effect === "barn_plus_3" ? "擴建" : "蓋"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {farm.decor.some((d) => d.slot !== null) && (
        <section>
          <p className="mono-label">已經蓋的（拆掉退一半材料）</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {farm.decor
              .filter((d) => d.slot !== null)
              .map((d) => {
                const kind = getDecorKind(d.kind);
                if (!kind) return null;
                const fixed = kind.effect === "trophy";
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      disabled={fixed}
                      onClick={() => game.demolish(d.id)}
                      className="chip min-h-9 disabled:opacity-60"
                      title={fixed ? "成就送的，不能拆" : "拆掉"}
                    >
                      {kind.emoji} {kind.name}
                      {!fixed && <span className="text-neutral-400">×</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DexTab() {
  const farm = useGameStore((s) => s.farm);
  const owned = new Map<string, OwnedPet[]>();
  for (const p of farm.pets) owned.set(p.kind, [...(owned.get(p.kind) ?? []), p]);
  const howTo = (kind: PetKind) => {
    if (kind.achievement) return ACHIEVEMENT_LABELS[kind.achievement];
    const decor = kind.requiresDecor ? getDecorKind(kind.requiresDecor) : undefined;
    return decor ? `商店領養，要先蓋${decor.name}` : "商店領養";
  };
  const collected = PET_KINDS.filter((k) => owned.has(k.id)).length;
  return (
    <div>
      <p className="text-sm text-neutral-600">
        收集 {collected} / {PET_KINDS.length}
      </p>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {PET_KINDS.map((kind) => {
          const have = owned.get(kind.id);
          const best = have ? Math.max(...have.map((p) => p.growth)) : 0;
          return (
            <li
              key={kind.id}
              data-owned={Boolean(have)}
              className="rounded-xl border border-neutral-200 bg-white p-2 text-center data-[owned=false]:opacity-60 data-[owned=false]:grayscale"
            >
              <p className="text-3xl">{kind.emoji}</p>
              <p className="text-sm font-bold">{kind.name}</p>
              <p className="text-[11px] text-neutral-500">
                {have
                  ? `${have.length} 隻・${STAGE_LABELS[petStage(best)]}`
                  : `${TIER_LABELS[kind.tier]}・${howTo(kind)}`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        傳說寵物買不到：{Object.values(ACHIEVEMENT_LABELS).join("、")}。
      </p>
    </div>
  );
}
