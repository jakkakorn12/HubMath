"use client";

import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";

const DEFAULT_TEAMS = ["ทีม 1", "ทีม 2", "ทีม 3", "ทีม 4"];

export default function TeamScoreboard() {
  const [names, setNames] = useState<string[]>(DEFAULT_TEAMS);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);

  function adjust(i: number, delta: number) {
    setScores((s) => s.map((v, idx) => (idx === i ? v + delta : v)));
  }

  function rename(i: number, name: string) {
    setNames((n) => n.map((v, idx) => (idx === i ? name : v)));
  }

  function resetAll() {
    setScores([0, 0, 0, 0]);
  }

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-muted">คะแนนแข่งในห้อง</h3>
        <ConfirmButton message="ล้างคะแนนทุกทีมใช่ไหม?" confirmLabel="ล้างคะแนน" onConfirm={resetAll}>
          ล้างคะแนนทุกทีม
        </ConfirmButton>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {names.map((name, i) => (
          <div key={i} className="border-[0.5px] border-border rounded-control p-3 text-center space-y-2">
            <input
              value={name}
              onChange={(e) => rename(i, e.target.value)}
              className="w-full text-center text-xs font-medium text-ink-muted bg-transparent focus:outline-none focus:ring-1 focus:ring-navy-600 rounded"
            />
            <p className="text-2xl font-bold text-navy-900 font-mono tabular-nums">{scores[i]}</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => adjust(i, -1)}
                className="w-7 h-7 rounded-control border-[0.5px] border-border hover:bg-surface text-sm"
              >
                −
              </button>
              <button
                onClick={() => adjust(i, 1)}
                className="w-7 h-7 rounded-control border-[0.5px] border-border hover:bg-surface text-sm"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
