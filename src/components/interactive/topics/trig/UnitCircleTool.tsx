"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MathText } from "../../mathMarkup";
import { SPECIAL_ANGLES, normalize, quadrantOf, referenceAngle, exactValue, radianLabel } from "./trigMath";

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 110;

function nearestSpecialAngle(deg: number): number {
  return SPECIAL_ANGLES.reduce((best, a) => {
    const d1 = Math.min(Math.abs(a - deg), 360 - Math.abs(a - deg));
    const d2 = Math.min(Math.abs(best - deg), 360 - Math.abs(best - deg));
    return d1 < d2 ? a : best;
  }, SPECIAL_ANGLES[0]);
}

export default function UnitCircleTool() {
  const [angle, setAngle] = useState(30);
  const [snap, setSnap] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const norm = normalize(angle);
  const rad = (norm * Math.PI) / 180;
  const px = CENTER + RADIUS * Math.cos(rad);
  const py = CENTER - RADIUS * Math.sin(rad);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * SIZE - CENTER;
      const y = CENTER - ((clientY - rect.top) / rect.height) * SIZE;
      let deg = normalize((Math.atan2(y, x) * 180) / Math.PI);
      if (snap) deg = nearestSpecialAngle(deg);
      setAngle(Math.round(deg));
    },
    [snap]
  );

  function onPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  const sinExact = exactValue("sin", norm);
  const cosExact = exactValue("cos", norm);
  const tanExact = exactValue("tan", norm);
  const sinNum = Math.sin(rad);
  const cosNum = Math.cos(rad);
  const tanDisplay = tanExact ?? (Math.abs(cosNum) < 1e-9 ? "หาค่าไม่ได้" : (sinNum / cosNum).toFixed(3));

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 grid md:grid-cols-2 gap-6 items-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[320px] mx-auto touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="#e5e3dc" strokeWidth={1} />
        <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="#e5e3dc" strokeWidth={1} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#185fa5" strokeWidth={1.5} />
        <path
          d={`M ${CENTER} ${CENTER} L ${CENTER + RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 ${
            norm > 180 ? 1 : 0
          } 0 ${px} ${py} Z`}
          fill="#e6f1fb"
        />
        <line x1={px} y1={py} x2={px} y2={CENTER} stroke="#993c1d" strokeWidth={1} strokeDasharray="4 3" />
        <line x1={px} y1={py} x2={CENTER} y2={py} stroke="#639922" strokeWidth={1} strokeDasharray="4 3" />
        <line x1={CENTER} y1={CENTER} x2={px} y2={py} stroke="#042c53" strokeWidth={1.5} />
        <circle
          cx={px}
          cy={py}
          r={10}
          fill="#042c53"
          stroke="white"
          strokeWidth={2}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
        />
        <text
          x={px + (px > CENTER ? 14 : -14)}
          y={py - 12}
          fontSize={12}
          fill="#042c53"
          textAnchor={px > CENTER ? "start" : "end"}
        >
          ({cosNum.toFixed(2)}, {sinNum.toFixed(2)})
        </text>
      </svg>

      <div className="space-y-3">
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-ink mb-1">
            <span>มุม θ</span>
            <span className="font-mono text-navy-600">{norm}°</span>
          </label>
          <input
            type="range"
            min={0}
            max={359}
            value={norm}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-navy-600"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="accent-navy-600" />
          ล็อกที่มุมพิเศษ (0°, 30°, 45°, 60°, 90°, ...)
        </label>

        <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
          <p className="flex justify-between">
            <span className="text-ink-muted">sin θ</span>
            <span className="font-mono text-ink">
              <MathText text={sinExact ?? sinNum.toFixed(3)} />
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">cos θ</span>
            <span className="font-mono text-ink">
              <MathText text={cosExact ?? cosNum.toFixed(3)} />
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">tan θ</span>
            <span className="font-mono text-ink">
              <MathText text={tanDisplay} />
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">จตุภาค</span>
            <span className="text-ink">{quadrantOf(norm)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">มุมอ้างอิง</span>
            <span className="text-ink">{referenceAngle(norm)}°</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">เรเดียน</span>
            <span className="font-mono text-ink">
              <MathText text={radianLabel(norm)} />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
