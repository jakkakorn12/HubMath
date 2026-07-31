"use client";

import { useState } from "react";

const FREQ_OPTIONS = [
  { label: "รายปี", value: 1 },
  { label: "ราย 6 เดือน", value: 2 },
  { label: "รายไตรมาส", value: 4 },
  { label: "รายเดือน", value: 12 },
  { label: "รายวัน", value: 365 },
];

export default function MoneyTool() {
  const [principal, setPrincipal] = useState(10000);
  const [ratePercent, setRatePercent] = useState(5);
  const [years, setYears] = useState(10);
  const [freq, setFreq] = useState(12);

  const r = ratePercent / 100;
  const compoundAt = (t: number) => principal * Math.pow(1 + r / freq, freq * t);
  const simpleAt = (t: number) => principal * (1 + r * t);

  const finalCompound = compoundAt(years);
  const finalSimple = simpleAt(years);
  const diff = finalCompound - finalSimple;
  const effectiveAnnualRate = (Math.pow(1 + r / freq, freq) - 1) * 100;
  const doublingYears = Math.log(2) / (freq * Math.log(1 + r / freq));

  const CHART_W = 360;
  const CHART_H = 200;
  const PAD = 24;
  const maxVal = finalCompound || 1;
  const barW = (CHART_W - PAD * 2) / years;

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>เงินต้น (บาท)</span>
            <span className="font-mono text-navy-600">{principal.toLocaleString()}</span>
          </label>
          <input type="range" min={1000} max={100000} step={1000} value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>อัตราดอกเบี้ยต่อปี</span>
            <span className="font-mono text-navy-600">{ratePercent}%</span>
          </label>
          <input type="range" min={0.5} max={15} step={0.5} value={ratePercent} onChange={(e) => setRatePercent(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>ระยะเวลา (ปี)</span>
            <span className="font-mono text-navy-600">{years}</span>
          </label>
          <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="block text-sm text-ink mb-1">ความถี่ทบต้น</label>
          <select
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            {FREQ_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full max-w-[420px] mx-auto">
        <line x1={PAD} y1={CHART_H - PAD} x2={CHART_W - PAD} y2={CHART_H - PAD} stroke="#9a9992" strokeWidth={1} />
        {Array.from({ length: years }, (_, i) => i + 1).map((yr) => {
          const val = compoundAt(yr);
          const h = ((CHART_H - PAD * 2) * val) / maxVal;
          const x = PAD + (yr - 1) * barW;
          const y = CHART_H - PAD - h;
          return <rect key={yr} x={x + 1} y={y} width={Math.max(barW - 2, 1)} height={h} fill="#639922" opacity={0.85} />;
        })}
        <polyline
          points={Array.from({ length: years }, (_, i) => i + 1)
            .map((yr) => {
              const val = simpleAt(yr);
              const h = ((CHART_H - PAD * 2) * val) / maxVal;
              const x = PAD + (yr - 1) * barW + barW / 2;
              const y = CHART_H - PAD - h;
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#993c1d"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      </svg>
      <p className="text-xs text-ink-faint text-center">แท่งเขียว = ดอกเบี้ยทบต้น · เส้นแดงประ = ดอกเบี้ยเชิงเดี่ยว</p>

      <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
        <p className="flex justify-between">
          <span className="text-ink-muted">มูลค่าเมื่อทบต้น ({years} ปี)</span>
          <span className="font-mono text-ink font-bold">{finalCompound.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท</span>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">มูลค่าเมื่อดอกเบี้ยเชิงเดี่ยว</span>
          <span className="font-mono text-ink">{finalSimple.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท</span>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">ผลต่าง</span>
          <span className="font-mono text-success-strong">+{diff.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท</span>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">อัตราดอกเบี้ยที่แท้จริงต่อปี</span>
          <span className="font-mono text-ink">{effectiveAnnualRate.toFixed(2)}%</span>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">ระยะเวลาเงินเป็นสองเท่า</span>
          <span className="font-mono text-ink">{isFinite(doublingYears) ? `${doublingYears.toFixed(1)} ปี` : "—"}</span>
        </p>
      </div>
    </div>
  );
}
