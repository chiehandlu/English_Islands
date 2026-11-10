"use client";

import { useEffect, useMemo, useState } from "react";
import { findBuilding, findQuestion, originKind, unitOfIsland } from "@/content/islands";
import { starsForRatio } from "@/game/engine";
import {
  dictationPriority,
  dueMistakes,
  frequentlyWrong,
  reviewSet,
  toDateString,
} from "@/game/review";
import {
  type Answer,
  type QuizItem,
  type QuizSession,
  correctAnswerSpeech,
  correctAnswerText,
  createSession,
  currentItem,
  isCorrect,
  isFinished,
  rng,
  spellTiles,
  submit,
  summary,
} from "@/game/quiz";
import type { Building, MatchQuestion, OrderQuestion, Question, SpellQuestion } from "@/game/types";
import { select } from "@/lib/selection";
import { speakChinese, speakEnglish, stopSpeaking } from "@/lib/speech";
import type { RunOutcome } from "@/game/rewards";
import { type QuizSummary, useGameStore } from "@/store/gameStore";
import { type QuizTarget, useUiStore } from "@/store/uiStore";
import { RewardList } from "./RewardList";
import { Stars } from "./Stars";

type Phase = "question" | "feedback" | "done";

/** 全螢幕答題面板：一次一題、大按鈕、答錯立刻講解。 */
export function QuizPanel({ target }: { target: NonNullable<QuizTarget> }) {
  const game = useGameStore();
  const closeQuiz = useUiStore((s) => s.closeQuiz);

  const { building, islandKind, questions, priority, troubleCount, title } = useMemo(() => {
    const day = toDateString(new Date());
    if (target.kind === "building") {
      const found = findBuilding(target.buildingId);
      if (!found) {
        return {
          building: undefined,
          islandKind: null,
          questions: [] as Question[],
          priority: [] as string[],
          troubleCount: 0,
          title: "",
        };
      }
      const { building: b, island } = found;
      const title = `${b.emoji} ${b.name}`;
      if (b.generated === "review" && b.reviewKind) {
        // 複習島：以這個單元該種島的常錯題為主，不足再補其他題
        const set = reviewSet(game, unitOfIsland(island), b.reviewKind, day);
        return {
          building: b,
          islandKind: island.kind,
          questions: set.questions,
          priority: set.questions.slice(0, set.troubleCount).map((q) => q.id),
          troubleCount: set.troubleCount,
          title,
        };
      }
      // 拼字練習：還沒拼對過的字、常拼錯的字一定會出現
      const dictation = b.generated === "dictation";
      const trouble = dictation ? frequentlyWrong(game, b.questions).slice(0, 5) : [];
      return {
        building: b,
        islandKind: island.kind,
        questions: b.questions,
        priority: dictation ? dictationPriority(game, b.questions).map((q) => q.id) : [],
        troubleCount: trouble.length,
        title,
      };
    }
    const due = dueMistakes(game, day);
    const qs = due
      .map((m) => findQuestion(m.questionId)?.question)
      .filter((q): q is Question => Boolean(q));
    return {
      building: undefined,
      islandKind: null,
      questions: qs,
      priority: [] as string[],
      troubleCount: 0,
      title: "🎒 錯題袋",
    };
    // 只在開啟時建立一次題目清單
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // 錯題袋與複習島答對，都會把題目從錯題袋拿掉
  const reviewing = target.kind === "review" || building?.generated === "review";

  const [session, setSession] = useState<QuizSession>(() =>
    createSession(building?.id ?? null, questions, Date.now(), undefined, priority),
  );
  const [phase, setPhase] = useState<Phase>(questions.length === 0 ? "done" : "question");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [summaryResult, setSummaryResult] = useState<QuizSummary | null>(null);

  const item = currentItem(session);
  // 作答後 index 已前進，回饋畫面要顯示剛剛答的那一題
  const answered = session.items[session.index - 1];
  const result = summary(session);

  useEffect(() => () => stopSpeaking(), []);

  const answer = (given: Answer) => {
    if (!item) return;
    const correct = isCorrect(item.question, given);
    setLastCorrect(correct);
    setSession(submit(session, correct));
    setPhase("feedback");
    const buildingId = building?.id ?? findQuestion(item.question.id)?.building.id ?? "";
    if (correct) {
      game.markRight(item.question.id, reviewing);
      speakEnglish(correctAnswerSpeech(item.question) ?? "");
    } else {
      game.markWrong(item.question.id, buildingId);
      const speech = correctAnswerSpeech(item.question);
      if (speech) speakEnglish(speech);
    }
  };

  const next = () => {
    stopSpeaking();
    if (isFinished(session)) {
      // 結算：建築挑戰記錄星星；兩種都發獎勵、領里程碑
      if (session.items.length > 0) {
        // 材料照題目原本的島算（複習島、錯題袋也一樣）
        const outcomes = session.items.map((it, i) => ({
          questionId: it.question.id,
          type: it.question.type,
          islandKind: originKind(it.question.id),
          correct: session.results[i] ?? false,
        }));
        const run: RunOutcome = {
          buildingId: building?.id ?? null,
          islandKind,
          outcomes,
          reviewCleared:
            target.kind === "review" &&
            dueMistakes(useGameStore.getState(), toDateString(new Date())).length === 0,
        };
        setSummaryResult(game.finishQuiz(run, result.ratio));
      }
      setPhase("done");
    } else setPhase("question");
  };

  const retry = () => {
    setSession(createSession(building?.id ?? null, questions, Date.now(), undefined, priority));
    setSummaryResult(null);
    setPhase("question");
  };

  const backToIsland = () => {
    closeQuiz();
    if (building) {
      const found = findBuilding(building.id);
      if (found) select({ kind: "island", id: found.island.id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="glass-card flex max-h-dvh w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:max-h-[92vh] sm:rounded-b-2xl">
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          {phase !== "done" && (
            <span className="mono-label">
              {phase === "question" ? session.index + 1 : session.index} / {session.items.length}
            </span>
          )}
          <button type="button" onClick={closeQuiz} className="icon-button" aria-label="關閉">
            ×
          </button>
        </header>
        {phase !== "done" && (
          <div className="mx-5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(session.index / Math.max(1, session.items.length)) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {phase === "question" && item && (
            <QuestionView key={item.question.id} item={item} onAnswer={answer} />
          )}
          {phase === "feedback" && answered && (
            <Feedback item={answered} correct={lastCorrect} onNext={next} />
          )}
          {phase === "question" && item && troubleCount > 0 && session.index === 0 && (
            <p className="mt-4 text-center text-sm text-neutral-500">
              這次有 {troubleCount} 題是之前常答錯的，再試一次！
            </p>
          )}
          {phase === "done" && (
            <Done
              building={building}
              review={target.kind === "review"}
              correct={result.correct}
              total={result.total}
              summary={summaryResult}
              onRetry={retry}
              onBack={backToIsland}
              onFarm={() => {
                closeQuiz();
                select({ kind: "farm", id: "farm" });
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SpeakButton({ text, label = "聽一次" }: { text?: string; label?: string }) {
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => speakEnglish(text)}
      className="chip min-h-12 gap-2 px-4 text-base"
    >
      <span aria-hidden>🔊</span>
      {label}
    </button>
  );
}

function QuestionView({ item, onAnswer }: { item: QuizItem; onAnswer: (a: Answer) => void }) {
  const q = item.question;
  const sayText = "say" in q ? q.say : undefined;

  // 聽力題一開啟就唸一次
  useEffect(() => {
    if (q.type === "listen") speakEnglish(q.say);
  }, [q]);

  switch (q.type) {
    case "choice":
    case "listen": {
      // 填空題的 say 含答案，作答前不給聽；聽力題本來就是要聽
      const hasBlank = q.type === "choice" && /_{2,}/.test(q.prompt);
      const preview = q.type === "listen" ? q.say : hasBlank ? undefined : sayText;
      return (
        <div className="space-y-5">
          <Prompt text={q.prompt ?? "聽聽看，然後選出答案"} say={preview} />
          <div className="grid gap-3">
            {item.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAnswer(opt)}
                className="answer-button"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "yesno":
      return (
        <div className="space-y-5">
          <Prompt text={q.prompt} say={q.say ?? q.prompt} hint="這句話對嗎？" />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onAnswer(true)} className="answer-button">
              ✅ Yes
            </button>
            <button type="button" onClick={() => onAnswer(false)} className="answer-button">
              ❌ No
            </button>
          </div>
        </div>
      );
    case "spell":
      return <SpellView q={q} onAnswer={onAnswer} />;
    case "order":
      return <OrderView q={q} item={item} onAnswer={onAnswer} />;
    case "match":
      return <MatchView q={q} item={item} onAnswer={onAnswer} />;
  }
}

function Prompt({ text, say, hint }: { text: string; say?: string; hint?: string }) {
  return (
    <div className="space-y-3">
      {hint && <p className="text-sm text-neutral-500">{hint}</p>}
      <p className="text-2xl leading-snug font-bold">{text}</p>
      <SpeakButton text={say} />
    </div>
  );
}

function SpellView({ q, onAnswer }: { q: SpellQuestion; onAnswer: (a: Answer) => void }) {
  const dictation = q.mode === "dictation";
  const tiles = useMemo(
    () => spellTiles(q.answer, rng(q.id.length * 131 + q.answer.length), dictation ? 4 : 3),
    [q, dictation],
  );
  const [used, setUsed] = useState<number[]>([]);
  const target = q.answer.replace(/\s+/g, "");
  // 片語（post office）在兩個字中間留一點空隙，提示是兩個字
  const gapsAfter = new Set<number>();
  q.answer
    .trim()
    .split(/\s+/)
    .reduce((n, word) => {
      gapsAfter.add(n + word.length - 1);
      return n + word.length;
    }, 0);
  const typed = used.map((i) => tiles[i]).join("");
  const say = q.say ?? q.answer;

  // 拼字練習：一開啟就把單字唸出來，小朋友聽了再拼
  useEffect(() => {
    if (dictation) speakEnglish(say);
  }, [dictation, say]);

  return (
    <div className="space-y-5">
      <Prompt text={q.prompt} say={say} hint={dictation ? "聽聽看，然後拼出這個字" : "拼出英文"} />
      <div className="flex min-h-14 flex-wrap items-center gap-1 rounded-2xl bg-sand/40 p-3 text-2xl font-bold tracking-widest">
        {Array.from({ length: target.length }).map((_, i) => (
          <span
            key={i}
            data-gap={gapsAfter.has(i) && i < target.length - 1}
            className="grid h-11 w-9 place-items-center rounded-lg border-b-4 border-neutral-300 bg-white data-[gap=true]:mr-4"
          >
            {typed[i] ?? ""}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map((letter, i) => (
          <button
            key={i}
            type="button"
            disabled={used.includes(i) || typed.length >= target.length}
            onClick={() => setUsed([...used, i])}
            className="tile"
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setUsed(used.slice(0, -1))}
          className="chip min-h-12 flex-1 justify-center text-base"
        >
          ⌫ 退一格
        </button>
        <button
          type="button"
          disabled={typed.length !== target.length}
          onClick={() => onAnswer(typed)}
          className="btn-primary flex-1"
        >
          確定
        </button>
      </div>
    </div>
  );
}

function OrderView({
  q,
  item,
  onAnswer,
}: {
  q: OrderQuestion;
  item: QuizItem;
  onAnswer: (a: Answer) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const sentence = picked.map((i) => item.shuffled[i]).join(" ");

  return (
    <div className="space-y-5">
      <Prompt text={q.prompt} hint="點字，排成一句話" />
      <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl bg-sand/40 p-3">
        {picked.length === 0 && <span className="text-neutral-400">點下面的字放進來</span>}
        {picked.map((i, n) => (
          <button
            key={`${i}-${n}`}
            type="button"
            onClick={() => setPicked(picked.filter((_, k) => k !== n))}
            className="word-chip bg-white"
          >
            {item.shuffled[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.shuffled.map((word, i) => (
          <button
            key={i}
            type="button"
            disabled={picked.includes(i)}
            onClick={() => setPicked([...picked, i])}
            className="word-chip"
          >
            {word}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <SpeakButton text={sentence} label="聽我排的" />
        <button
          type="button"
          disabled={picked.length !== item.shuffled.length}
          onClick={() => onAnswer(sentence)}
          className="btn-primary flex-1"
        >
          確定
        </button>
      </div>
    </div>
  );
}

const PAIR_COLORS = ["bg-orange-200", "bg-sky-200", "bg-lime-200", "bg-violet-200", "bg-pink-200"];

function MatchView({
  q,
  item,
  onAnswer,
}: {
  q: MatchQuestion;
  item: QuizItem;
  onAnswer: (a: Answer) => void;
}) {
  const lefts = q.pairs.map((p) => p[0]);
  const rights = item.shuffled;
  const [active, setActive] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const pairIndex = (left: string) => lefts.indexOf(left);
  const rightOwner = (right: string) => Object.keys(pairs).find((l) => pairs[l] === right);

  const tapLeft = (left: string) => {
    if (pairs[left]) {
      const rest = { ...pairs };
      delete rest[left];
      setPairs(rest);
    }
    setActive(left);
  };
  const tapRight = (right: string) => {
    if (!active) return;
    const owner = rightOwner(right);
    const rest = { ...pairs };
    if (owner) delete rest[owner];
    setPairs({ ...rest, [active]: right });
    setActive(null);
  };
  const complete = lefts.every((l) => pairs[l]);

  return (
    <div className="space-y-5">
      <Prompt text={q.prompt} hint="先點左邊，再點右邊" />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {lefts.map((left) => (
            <button
              key={left}
              type="button"
              onClick={() => tapLeft(left)}
              data-active={active === left}
              className={`match-button flex items-center justify-between gap-2 ${pairs[left] ? PAIR_COLORS[pairIndex(left)] : ""}`}
            >
              <span className="flex-1">{left}</span>
              {/[A-Za-z]/.test(left) && (
                <span
                  role="button"
                  aria-label="聽發音"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm opacity-60 hover:bg-black/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakEnglish(left);
                  }}
                >
                  🔊
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {rights.map((right) => {
            const owner = rightOwner(right);
            return (
              <button
                key={right}
                type="button"
                onClick={() => tapRight(right)}
                className={`match-button ${owner ? PAIR_COLORS[pairIndex(owner)] : ""}`}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        disabled={!complete}
        onClick={() => onAnswer(pairs)}
        className="btn-primary w-full"
      >
        確定
      </button>
    </div>
  );
}

function Feedback({
  item,
  correct,
  onNext,
}: {
  item: QuizItem;
  correct: boolean;
  onNext: () => void;
}) {
  const q = item.question;
  const speech = correctAnswerSpeech(q);
  return (
    <div className="space-y-5 text-center">
      <p className="text-6xl" aria-hidden>
        {correct ? "🎉" : "💡"}
      </p>
      <p className="text-2xl font-bold">{correct ? "答對了！" : "再想想看"}</p>
      <div className="rounded-2xl bg-sand/40 p-4 text-left">
        <p className="mono-label">正確答案</p>
        <p className="mt-1 text-xl font-bold">{correctAnswerText(q)}</p>
        {q.explain && (
          <p className="mt-2 flex items-start gap-2 text-neutral-700">
            <span className="flex-1">{q.explain}</span>
            <button
              type="button"
              onClick={() => speakChinese(q.explain!)}
              className="icon-button shrink-0"
              aria-label="聽解說"
            >
              🔊
            </button>
          </p>
        )}
      </div>
      <div className="flex justify-center gap-3">
        <SpeakButton text={speech} label="再聽一次" />
        <button type="button" onClick={onNext} className="btn-primary flex-1" autoFocus>
          下一題 →
        </button>
      </div>
    </div>
  );
}

function Done({
  building,
  review,
  correct,
  total,
  summary,
  onRetry,
  onBack,
  onFarm,
}: {
  building?: Building;
  review: boolean;
  correct: number;
  total: number;
  summary: QuizSummary | null;
  onRetry: () => void;
  onBack: () => void;
  onFarm: () => void;
}) {
  const ratio = total === 0 ? 0 : correct / total;
  const stars = starsForRatio(ratio);
  if (total === 0) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-6xl">🎒</p>
        <p className="text-xl font-bold">錯題袋是空的，太棒了！</p>
        <button type="button" onClick={onBack} className="btn-primary w-full">
          回到島上
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-5 text-center">
      <p className="text-6xl" aria-hidden>
        {stars === 3 ? "🏆" : stars >= 1 ? "✨" : "💪"}
      </p>
      {!review && <Stars value={stars} size="lg" />}
      <p className="text-2xl font-bold">
        {total} 題答對 {correct} 題
      </p>
      <p className="text-neutral-600">
        {review
          ? "答對的題目已經從錯題袋拿掉，答錯的過幾天再出現。"
          : building?.generated === "review"
            ? "常答錯的題目，多答對幾次就不會再排在前面了。"
            : stars === 0
              ? "再練習一次，答對一半以上房子就會亮燈。"
              : stars === 3
                ? `${building?.name ?? "這棟"}全亮了！`
                : `${building?.name ?? "這棟"}亮燈了，全對可以拿三顆星。`}
      </p>
      {summary && <RewardList summary={summary} onFarm={onFarm} />}
      <div className="flex gap-3">
        <button type="button" onClick={onRetry} className="chip min-h-12 flex-1 justify-center">
          再挑戰一次
        </button>
        <button type="button" onClick={onBack} className="btn-primary flex-1">
          回到島上
        </button>
      </div>
    </div>
  );
}
