"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { select, useSelection } from "@/lib/selection";
import { useHasHydrated } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { DetailCard } from "./DetailCard";
import { IndexPanel } from "./IndexPanel";
import { QuizPanel } from "./QuizPanel";
import { TopBar } from "./TopBar";

// WebGL 只能在瀏覽器執行
const World = dynamic(() => import("../scene/World"), {
  ssr: false,
  loading: () => (
    <p className="absolute inset-0 grid place-items-center text-neutral-500">島嶼載入中…</p>
  ),
});

export function WorldView() {
  const hydrated = useHasHydrated();
  const selection = useSelection();
  const quiz = useUiStore((s) => s.quiz);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <World />
      <TopBar />
      <DetailCard selection={selection} />
      <IndexPanel selection={selection} />
      {quiz && <QuizPanel key={JSON.stringify(quiz)} target={quiz} />}
    </div>
  );
}
