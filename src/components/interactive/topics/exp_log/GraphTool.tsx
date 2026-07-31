"use client";

import { useState } from "react";
import { MathText } from "../../mathMarkup";

const SIZE = 320;
const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -1;
const Y_MAX = 8;

function toSvgX(x: number) {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * SIZE;
}
function toSvgY(y: number) {
  return SIZE - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * SIZE;
}

function buildPath(fn: (x: number) => number, xMin: number, xMax: number, steps = 150): string {
  let d = "";
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const y = fn(x);
    if (!isFinite(y) || y < Y_MIN - 2 || y > Y_MAX + 2) {
      started = false;
      continue;
    }
    const px = toSvgX(x);
    const py = toSvgY(y);
    d += (started ? " L " : "M ") + `${px.toFixed(1)} ${py.toFixed(1)}`;
    started = true;
  }
  return d;
}

export default function GraphTool() {
  const [base, setBase] = useState(2);
  const [xRead, setXRead] = useState(1);
  const [showExp, setShowExp] = useState(true);
  const [showLog, setShowLog] = useState(true);
  const [showSymmetry, setShowSymmetry] = useState(false);

  const b = Math.abs(base - 1) < 0.05 ? 1.1 : base;
  const expY = Math.pow(b, xRead);
  const logDomainOk = xRead > 0;
  const logY = logDomainOk ? Math.log(xRead) / Math.log(b) : null;

  const expPath = buildPath((x) => Math.pow(b, x), X_MIN, X_MAX);
  const logPath = buildPath((x) => Math.log(x) / Math.log(b), 0.02, X_MAX);

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 grid md:grid-cols-2 gap-6 items-start">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[360px] mx-auto">
        {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i).map((gx) => (
          <line key={`vx${gx}`} x1={toSvgX(gx)} y1={0} x2={toSvgX(gx)} y2={SIZE} stroke="#f0efe9" strokeWidth={1} />
        ))}
        {Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => Y_MIN + i).map((gy) => (
          <line key={`hy${gy}`} x1={0} y1={toSvgY(gy)} x2={SIZE} y2={toSvgY(gy)} stroke="#f0efe9" strokeWidth={1} />
        ))}
        <line x1={0} y1={toSvgY(0)} x2={SIZE} y2={toSvgY(0)} stroke="#9a9992" strokeWidth={1} />
        <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={SIZE} stroke="#9a9992" strokeWidth={1} />

        {showSymmetry && (
          <line x1={toSvgX(X_MIN)} y1={toSvgY(X_MIN)} x2={toSvgX(X_MAX)} y2={toSvgY(X_MAX)} stroke="#ba7517" strokeWidth={1} strokeDasharray="4 3" />
        )}
        {showExp && <path d={expPath} stroke="#185fa5" strokeWidth={2} fill="none" />}
        {showLog && <path d={logPath} stroke="#993c1d" strokeWidth={2} fill="none" />}

        {showExp && <circle cx={toSvgX(0)} cy={toSvgY(1)} r={3.5} fill="#185fa5" />}
        {showExp && isFinite(expY) && expY >= Y_MIN && expY <= Y_MAX && (
          <circle cx={toSvgX(xRead)} cy={toSvgY(expY)} r={4.5} fill="#042c53" stroke="white" strokeWidth={1.5} />
        )}
      </svg>

      <div className="space-y-3">
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>ฐาน b</span>
            <span className="font-mono text-navy-600">{b.toFixed(1)}</span>
          </label>
          <input type="range" min={0.2} max={4} step={0.1} value={base} onChange={(e) => setBase(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>x ที่ต้องการอ่านค่า</span>
            <span className="font-mono text-navy-600">{xRead}</span>
          </label>
          <input type="range" min={-3} max={3} step={0.5} value={xRead} onChange={(e) => setXRead(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showExp} onChange={(e) => setShowExp(e.target.checked)} className="accent-navy-600" /> y = b^x
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showLog} onChange={(e) => setShowLog(e.target.checked)} className="accent-navy-600" /> y = log_b(x)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showSymmetry} onChange={(e) => setShowSymmetry(e.target.checked)} className="accent-navy-600" /> เส้น y = x
          </label>
        </div>

        <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
          <p className="flex justify-between">
            <span className="text-ink-muted">
              <MathText text={`${b.toFixed(1)}^{${xRead}}`} />
            </span>
            <span className="font-mono text-ink">{expY.toFixed(3)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">
              log<sub>{b.toFixed(1)}</sub>({xRead})
            </span>
            <span className="font-mono text-ink">{logDomainOk ? logY!.toFixed(3) : "ไม่นิยาม (x ต้อง > 0)"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
