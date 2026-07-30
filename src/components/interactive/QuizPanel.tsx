"use client";

import { useCallback, useEffect, useState } from "react";
import { MathText } from "./mathMarkup";
import Curtain from "./Curtain";
import type { QuizQuestion } from "./types";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

export default function QuizPanel({
  generate,
  onAnswered,
}: {
  generate: () => QuizQuestion;
  onAnswered?: (correct: boolean) => void;
}) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setQuestion(generate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => {
    setQuestion(generate());
    setPicked(null);
  }, [generate]);

  const pick = useCallback(
    (i: number) => {
      if (picked !== null || !question) return;
      setPicked(i);
      const isCorrect = i === question.correct;
      setAsked((a) => a + 1);
      setRight((r) => (isCorrect ? r + 1 : r));
      setStreak((s) => (isCorrect ? s + 1 : 0));
      onAnswered?.(isCorrect);
    },
    [picked, question, onAnswered]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question) return;
      if (picked === null && ["1", "2", "3", "4"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < question.choices.length) pick(idx);
      }
      if (picked !== null && e.key === "Enter") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, picked, pick, next]);

  if (!question) return null;

  const accuracy = asked > 0 ? Math.round((right / asked) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-faint">
        <span>
          ถูก {right}/{asked} ข้อ
        </span>
        <span>·</span>
        <span>ความแม่นยำ {accuracy}%</span>
        {streak > 1 && (
          <>
            <span>·</span>
            <span className="text-success-strong font-medium">ถูกติดต่อกัน {streak} ข้อ 🔥</span>
          </>
        )}
      </div>

      <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-4">
        <p className="text-base font-semibold text-ink">
          <MathText text={question.prompt} />
        </p>

        <div className="space-y-2">
          {question.choices.map((choice, i) => {
            let stateClass = "border-border hover:bg-surface";
            if (picked !== null) {
              if (i === question.correct) stateClass = "border-success bg-success-soft";
              else if (i === picked) stateClass = "border-danger bg-danger-soft";
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`w-full text-left flex items-center gap-3 border-[0.5px] rounded-control px-4 py-3 text-sm transition-colors disabled:cursor-default ${stateClass}`}
              >
                <span className="shrink-0 w-6 h-6 rounded-full border-[0.5px] border-current flex items-center justify-center text-xs font-medium">
                  {CHOICE_LABELS[i]}
                </span>
                <span className="text-ink">
                  <MathText text={choice} />
                </span>
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="space-y-3">
            <Curtain label="ดูวิธีคิด">
              <MathText text={question.solution} className="text-sm text-ink" />
            </Curtain>
            <button
              onClick={next}
              className="w-full bg-navy-900 text-white rounded-control py-2.5 text-sm font-medium hover:opacity-90"
            >
              โจทย์ข้อต่อไป →
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-faint text-center">กด 1-4 เพื่อตอบ · Enter เพื่อไปข้อถัดไป</p>
    </div>
  );
}
