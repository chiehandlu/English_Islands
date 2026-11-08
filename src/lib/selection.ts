"use client";

import { useSyncExternalStore } from "react";

/** 選取狀態寫在 URL hash（#island=pregnancy），可分享、可上一頁。 */
export type Selection =
  | { kind: "island"; id: string }
  | { kind: "building"; id: string }
  | { kind: "flow"; id: string }
  | null;

const KINDS = ["island", "building", "flow"] as const;

export function parseSelection(hash: string): Selection {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  for (const kind of KINDS) {
    const id = params.get(kind);
    if (id) return { kind, id };
  }
  return null;
}

export function formatSelection(selection: Selection): string {
  return selection ? `#${selection.kind}=${encodeURIComponent(selection.id)}` : "";
}

export function select(selection: Selection) {
  const hash = formatSelection(selection);
  if (hash === window.location.hash) return;
  if (hash) {
    window.location.hash = hash;
  } else {
    history.pushState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

export function useSelection(): Selection {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  return parseSelection(hash);
}
