"use client";

import { useEffect, useState } from "react";

const PRESETS = [30, 60, 180];

export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function start(preset: number) {
    setSeconds(preset);
    setRunning(true);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const low = seconds > 0 && seconds <= 10;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-mono text-lg font-bold tabular-nums ${low ? "text-danger-strong" : "text-ink"}`}>
        {mm}:{ss}
      </span>
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => start(p)}
          className="text-xs font-medium border-[0.5px] border-border rounded-control px-2.5 py-1 hover:bg-surface"
        >
          {p < 60 ? `${p} วิ` : `${p / 60} นาที`}
        </button>
      ))}
      {running && (
        <button
          onClick={() => setRunning(false)}
          className="text-xs font-medium text-danger-strong border-[0.5px] border-danger rounded-control px-2.5 py-1 hover:bg-danger-soft"
        >
          หยุด
        </button>
      )}
    </div>
  );
}
