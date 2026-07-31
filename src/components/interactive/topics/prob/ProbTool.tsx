"use client";

import { useState } from "react";

type Mode = "dice" | "coins";

function diceWays(sum: number): number {
  let count = 0;
  for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === sum) count++;
  return count;
}
function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

export default function ProbTool() {
  const [mode, setMode] = useState<Mode>("dice");
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [totalTrials, setTotalTrials] = useState(0);

  const outcomes = mode === "dice" ? Array.from({ length: 11 }, (_, i) => i + 2) : [0, 1, 2, 3];
  const theoretical = (k: number) => (mode === "dice" ? diceWays(k) / 36 : choose(3, k) / 8);

  function switchMode(next: Mode) {
    setMode(next);
    setCounts({});
    setTotalTrials(0);
  }

  function runTrials(trials: number) {
    const next = { ...counts };
    for (let i = 0; i < trials; i++) {
      let outcome: number;
      if (mode === "dice") {
        outcome = 1 + Math.floor(Math.random() * 6) + (1 + Math.floor(Math.random() * 6));
      } else {
        outcome = 0;
        for (let c = 0; c < 3; c++) if (Math.random() < 0.5) outcome++;
      }
      next[outcome] = (next[outcome] ?? 0) + 1;
    }
    setCounts(next);
    setTotalTrials((t) => t + trials);
  }

  function reset() {
    setCounts({});
    setTotalTrials(0);
  }

  const CHART_W = 360;
  const CHART_H = 180;
  const PAD = 30;
  const barW = (CHART_W - PAD * 2) / outcomes.length;
  const maxProb = Math.max(...outcomes.map((k) => Math.max(theoretical(k), totalTrials ? (counts[k] ?? 0) / totalTrials : 0)), 0.05);

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => switchMode("dice")}
          className={`text-xs px-3 py-1.5 rounded-control border-[0.5px] transition-colors ${
            mode === "dice" ? "bg-navy-900 text-white border-navy-900" : "border-border text-ink-muted hover:bg-surface"
          }`}
        >
          ลูกเต๋า 2 ลูก (ผลรวม)
        </button>
        <button
          onClick={() => switchMode("coins")}
          className={`text-xs px-3 py-1.5 rounded-control border-[0.5px] transition-colors ${
            mode === "coins" ? "bg-navy-900 text-white border-navy-900" : "border-border text-ink-muted hover:bg-surface"
          }`}
        >
          เหรียญ 3 เหรียญ (จำนวนหัว)
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 10, 100, 1000].map((t) => (
          <button
            key={t}
            onClick={() => runTrials(t)}
            className="text-xs font-medium border-[0.5px] border-border rounded-control px-3 py-1.5 hover:bg-surface"
          >
            ทดลอง +{t.toLocaleString()} ครั้ง
          </button>
        ))}
        <button
          onClick={reset}
          className="text-xs font-medium text-danger-strong border-[0.5px] border-danger rounded-control px-3 py-1.5 hover:bg-danger-soft"
        >
          ล้างข้อมูล
        </button>
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full max-w-[420px] mx-auto">
        <line x1={PAD} y1={CHART_H - PAD} x2={CHART_W - PAD} y2={CHART_H - PAD} stroke="#9a9992" strokeWidth={1} />
        {outcomes.map((k, i) => {
          const observed = totalTrials ? (counts[k] ?? 0) / totalTrials : 0;
          const h = (observed / maxProb) * (CHART_H - PAD * 2);
          const x = PAD + i * barW;
          const y = CHART_H - PAD - h;
          const tickY = CHART_H - PAD - (theoretical(k) / maxProb) * (CHART_H - PAD * 2);
          return (
            <g key={k}>
              <rect x={x + 2} y={y} width={Math.max(barW - 4, 1)} height={h} fill="#185fa5" opacity={0.85} />
              <line x1={x} y1={tickY} x2={x + barW} y2={tickY} stroke="#993c1d" strokeWidth={2} />
              <text x={x + barW / 2} y={CHART_H - PAD + 14} fontSize={10} fill="#6b6a64" textAnchor="middle">
                {k}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-ink-faint text-center">แท่งฟ้า = ความถี่สัมพัทธ์จากการทดลอง · เส้นแดง = ความน่าจะเป็นทางทฤษฎี</p>

      <div className="bg-surface rounded-control p-4 text-sm">
        <p className="flex justify-between">
          <span className="text-ink-muted">จำนวนครั้งที่ทดลองสะสม</span>
          <span className="font-mono text-ink">{totalTrials.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
