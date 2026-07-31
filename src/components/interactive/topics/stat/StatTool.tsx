"use client";

import { useMemo, useState } from "react";

const DEFAULT_DATA = "45 52 48 61 55 47 90 53 58 50";

function parseNumbers(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

export default function StatTool() {
  const [text, setText] = useState(DEFAULT_DATA);
  const numbers = useMemo(() => parseNumbers(text), [text]);
  const sorted = useMemo(() => [...numbers].sort((a, b) => a - b), [numbers]);

  const n = sorted.length;
  const mean = n ? numbers.reduce((s, v) => s + v, 0) / n : 0;
  const q1 = n ? quantile(sorted, 0.25) : 0;
  const median = n ? quantile(sorted, 0.5) : 0;
  const q3 = n ? quantile(sorted, 0.75) : 0;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const min = nonOutliers.length ? nonOutliers[0] : sorted[0];
  const max = nonOutliers.length ? nonOutliers[nonOutliers.length - 1] : sorted[sorted.length - 1];
  const sd = n > 1 ? Math.sqrt(numbers.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;

  const CHART_W = 360;
  const CHART_H = 140;
  const PAD = 30;
  const domainMin = sorted.length ? Math.min(sorted[0], lowerFence) : 0;
  const domainMax = sorted.length ? Math.max(sorted[sorted.length - 1], upperFence) : 1;
  const scaleX = (v: number) => PAD + ((v - domainMin) / (domainMax - domainMin || 1)) * (CHART_W - PAD * 2);
  const midY = CHART_H / 2;
  const boxH = 40;

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-5">
      <div>
        <label className="block text-sm text-ink mb-1">ข้อมูล (คั่นด้วยช่องว่างหรือจุลภาค)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      {n > 0 ? (
        <>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full max-w-[420px] mx-auto">
            <line x1={scaleX(min)} y1={midY} x2={scaleX(q1)} y2={midY} stroke="#185fa5" strokeWidth={1.5} />
            <line x1={scaleX(q3)} y1={midY} x2={scaleX(max)} y2={midY} stroke="#185fa5" strokeWidth={1.5} />
            <line x1={scaleX(min)} y1={midY - 10} x2={scaleX(min)} y2={midY + 10} stroke="#185fa5" strokeWidth={1.5} />
            <line x1={scaleX(max)} y1={midY - 10} x2={scaleX(max)} y2={midY + 10} stroke="#185fa5" strokeWidth={1.5} />
            <rect x={scaleX(q1)} y={midY - boxH / 2} width={Math.max(scaleX(q3) - scaleX(q1), 1)} height={boxH} fill="#e6f1fb" stroke="#185fa5" strokeWidth={1.5} />
            <line x1={scaleX(median)} y1={midY - boxH / 2} x2={scaleX(median)} y2={midY + boxH / 2} stroke="#042c53" strokeWidth={2} />
            {outliers.map((o, i) => (
              <circle key={i} cx={scaleX(o)} cy={midY} r={4} fill="none" stroke="#993c1d" strokeWidth={1.5} />
            ))}
          </svg>

          <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-ink-muted">จำนวนข้อมูล</span>
              <span className="font-mono text-ink">{n}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-muted">ค่าเฉลี่ย (mean)</span>
              <span className="font-mono text-ink">{mean.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-muted">Q1 / มัธยฐาน / Q3</span>
              <span className="font-mono text-ink">
                {q1.toFixed(1)} / {median.toFixed(1)} / {q3.toFixed(1)}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-muted">IQR</span>
              <span className="font-mono text-ink">{iqr.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-muted">ส่วนเบี่ยงเบนมาตรฐาน (SD)</span>
              <span className="font-mono text-ink">{sd.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-ink-muted">ค่านอกเกณฑ์ (outlier)</span>
              <span className="font-mono text-ink">{outliers.length ? outliers.join(", ") : "ไม่มี"}</span>
            </p>
          </div>
          <p className="text-xs text-ink-faint">
            ค่านอกเกณฑ์คือค่าที่ต่ำกว่า Q1 − 1.5×IQR หรือสูงกว่า Q3 + 1.5×IQR — ระบบทำเครื่องหมายให้เห็น แต่ไม่ได้ลบออกจากข้อมูลอัตโนมัติ
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-faint">กรอกข้อมูลตัวเลขอย่างน้อย 1 ค่า</p>
      )}
    </div>
  );
}
