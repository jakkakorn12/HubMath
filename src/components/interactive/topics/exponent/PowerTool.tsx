"use client";

import { useState } from "react";
import { MathText } from "../../mathMarkup";

type Mode = "multiply" | "divide" | "power";

function repeatMultiplication(base: number, count: number): string {
  if (count <= 0) return "1";
  return Array.from({ length: count }, () => String(base)).join(" × ");
}

export default function PowerTool() {
  const [mode, setMode] = useState<Mode>("multiply");
  const [a, setA] = useState(2);
  const [m, setM] = useState(3);
  const [n, setN] = useState(2);

  let topLine: string;
  let expandLine: string;
  let resultExp: number;

  if (mode === "multiply") {
    resultExp = m + n;
    topLine = `${a}^{${m}} × ${a}^{${n}}`;
    expandLine = `(${repeatMultiplication(a, m)}) × (${repeatMultiplication(a, n)}) = ${repeatMultiplication(a, resultExp)}`;
  } else if (mode === "divide") {
    resultExp = m - n;
    topLine = `${a}^{${m}} ÷ ${a}^{${n}}`;
    expandLine =
      resultExp >= 0
        ? `ตัดตัวคูณที่ซ้ำกัน ${n} ตัวออกจากบนและล่าง เหลือ ${repeatMultiplication(a, resultExp)}`
        : `ตัดตัวคูณที่ซ้ำกันออก เหลือ 1 / (${repeatMultiplication(a, -resultExp)})`;
  } else {
    resultExp = m * n;
    topLine = `(${a}^{${m}})^{${n}}`;
    expandLine = Array.from({ length: n }, () => `${a}^{${m}}`).join(" × ");
  }

  const resultValue = Math.pow(a, resultExp);
  const displayValue = Number.isInteger(resultValue) ? resultValue.toLocaleString() : resultValue.toFixed(4);

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "multiply", label: "a^m · a^n" },
            { key: "divide", label: "a^m ÷ a^n" },
            { key: "power", label: "(a^m)^n" },
          ] as { key: Mode; label: string }[]
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMode(opt.key)}
            className={`text-xs px-3 py-1.5 rounded-control border-[0.5px] transition-colors ${
              mode === opt.key ? "bg-navy-900 text-white border-navy-900" : "border-border text-ink-muted hover:bg-surface"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>ฐาน a</span>
            <span className="font-mono text-navy-600">{a}</span>
          </label>
          <input type="range" min={2} max={6} value={a} onChange={(e) => setA(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>m</span>
            <span className="font-mono text-navy-600">{m}</span>
          </label>
          <input type="range" min={1} max={6} value={m} onChange={(e) => setM(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>n</span>
            <span className="font-mono text-navy-600">{n}</span>
          </label>
          <input type="range" min={1} max={6} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
      </div>

      <div className="bg-surface rounded-control p-4 space-y-2 text-center">
        <p className="text-lg font-mono text-ink">
          <MathText text={topLine} />
        </p>
        <p className="text-sm text-ink-muted">
          <MathText text={expandLine} />
        </p>
        <p className="text-lg font-bold text-navy-900">
          <MathText text={`= ${a}^{${resultExp}}`} /> = {displayValue}
        </p>
      </div>
    </div>
  );
}
