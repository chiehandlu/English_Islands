"use client";

import { useUiStore } from "@/store/uiStore";
import { WorldView } from "./hud/WorldView";
import { ReportView } from "./ReportView";
import { StartCard } from "./StartCard";

/** 單一路由：首頁、島嶼、家長頁由 uiStore.view 切換。 */
export function App() {
  const view = useUiStore((s) => s.view);
  if (view === "play") return <WorldView />;
  if (view === "report") return <ReportView />;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <p className="mono-label">ENGLISH ISLANDS</p>
      <h1 className="text-5xl font-bold">英文島</h1>
      <p className="text-lg text-neutral-700">
        每一課都是三座小島：單字島、文法島、閱讀島。
        <br />
        答對題目，房子就會亮燈；三座島全亮，下一課的島就會浮出來。
      </p>
      <StartCard />
    </main>
  );
}
