"use client";

import { useCallback, useEffect, useState } from "react";
import { MathText } from "./mathMarkup";
import Curtain from "./Curtain";
import type { LessonStep } from "./types";

export default function StepLesson({
  steps,
  onStepSeen,
}: {
  steps: LessonStep[];
  onStepSeen?: (index: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  useEffect(() => {
    onStepSeen?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const goPrev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const goNext = useCallback(() => setCurrent((c) => Math.min(steps.length - 1, c + 1)), [steps.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if (!step) return <p className="text-sm text-ink-faint">ยังไม่มีเนื้อหาบทเรียน</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`text-xs px-3 py-1.5 rounded-control border-[0.5px] transition-colors ${
              i === current ? "bg-navy-900 text-white border-navy-900" : "border-border text-ink-muted hover:bg-surface"
            }`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full border-2 border-navy-600 flex items-center justify-center text-navy-600 font-bold -rotate-6">
            {current + 1}
          </span>
          <h3 className="text-lg font-bold text-ink">
            <MathText text={step.title} />
          </h3>
        </div>

        <ul className="space-y-1.5 list-disc list-inside text-sm text-ink-muted">
          {step.body.map((line, i) => (
            <li key={i}>
              <MathText text={line} />
            </li>
          ))}
        </ul>

        {step.formula && step.formula.length > 0 && (
          <div className="bg-navy-100/40 border-[0.5px] border-navy-600/30 rounded-control p-4 space-y-1 font-mono text-sm text-navy-900">
            {step.formula.map((f, i) => (
              <div key={i}>
                <MathText text={f} />
              </div>
            ))}
          </div>
        )}

        {step.worked && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">
              ลองคิดในใจ: <MathText text={step.worked.ask} />
            </p>
            <Curtain>
              <MathText text={step.worked.answer} className="text-sm text-ink" />
            </Curtain>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="text-sm text-navy-600 disabled:text-ink-faint disabled:cursor-not-allowed hover:underline"
        >
          ← ก่อนหน้า
        </button>
        <span className="text-xs text-ink-faint">
          {current + 1} / {steps.length}
        </span>
        <button
          onClick={goNext}
          disabled={current === steps.length - 1}
          className="text-sm text-navy-600 disabled:text-ink-faint disabled:cursor-not-allowed hover:underline"
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
}
