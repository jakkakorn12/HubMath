"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const SIZE = 320;
const CENTER = SIZE / 2;
const SCALE = 20;
const RANGE = 8;

function toSvg(x: number, y: number): [number, number] {
  return [CENTER + x * SCALE, CENTER - y * SCALE];
}
function fromSvg(px: number, py: number): [number, number] {
  return [(px - CENTER) / SCALE, (CENTER - py) / SCALE];
}
function clampGrid(v: number) {
  return Math.max(-RANGE, Math.min(RANGE, Math.round(v)));
}

export default function VectorTool() {
  const [u, setU] = useState<[number, number]>([3, 2]);
  const [v, setV] = useState<[number, number]>([1, 3]);
  const [showParallelogram, setShowParallelogram] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<"u" | "v" | null>(null);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg || !draggingRef.current) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * SIZE;
    const py = ((clientY - rect.top) / rect.height) * SIZE;
    const [x, y] = fromSvg(px, py);
    const next: [number, number] = [clampGrid(x), clampGrid(y)];
    if (draggingRef.current === "u") setU(next);
    else setV(next);
  }, []);

  function onPointerDown(which: "u" | "v") {
    return (e: ReactPointerEvent<SVGCircleElement>) => {
      draggingRef.current = which;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    };
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerUp() {
    draggingRef.current = null;
  }

  const sum: [number, number] = [u[0] + v[0], u[1] + v[1]];
  const dot = u[0] * v[0] + u[1] * v[1];
  const magU = Math.hypot(u[0], u[1]);
  const magV = Math.hypot(v[0], v[1]);
  const cosAngle = magU && magV ? dot / (magU * magV) : 0;
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;
  const perpendicular = dot === 0 && (u[0] !== 0 || u[1] !== 0) && (v[0] !== 0 || v[1] !== 0);

  const [uPx, uPy] = toSvg(u[0], u[1]);
  const [vPx, vPy] = toSvg(v[0], v[1]);
  const [sumPx, sumPy] = toSvg(sum[0], sum[1]);

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 grid md:grid-cols-2 gap-6 items-start">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[360px] mx-auto touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <marker id="arrowU" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#185fa5" />
          </marker>
          <marker id="arrowV" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#993c1d" />
          </marker>
          <marker id="arrowSum" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#639922" />
          </marker>
        </defs>

        {Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE).map((g) => (
          <g key={g}>
            <line x1={toSvg(g, -RANGE)[0]} y1={toSvg(g, -RANGE)[1]} x2={toSvg(g, RANGE)[0]} y2={toSvg(g, RANGE)[1]} stroke="#f0efe9" strokeWidth={1} />
            <line x1={toSvg(-RANGE, g)[0]} y1={toSvg(-RANGE, g)[1]} x2={toSvg(RANGE, g)[0]} y2={toSvg(RANGE, g)[1]} stroke="#f0efe9" strokeWidth={1} />
          </g>
        ))}
        <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="#9a9992" strokeWidth={1} />
        <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="#9a9992" strokeWidth={1} />

        {showParallelogram && <polygon points={`${CENTER},${CENTER} ${uPx},${uPy} ${sumPx},${sumPy} ${vPx},${vPy}`} fill="#e6f1fb" stroke="none" />}

        <line x1={CENTER} y1={CENTER} x2={uPx} y2={uPy} stroke="#185fa5" strokeWidth={2} markerEnd="url(#arrowU)" />
        <line x1={CENTER} y1={CENTER} x2={vPx} y2={vPy} stroke="#993c1d" strokeWidth={2} markerEnd="url(#arrowV)" />
        {showParallelogram && <line x1={CENTER} y1={CENTER} x2={sumPx} y2={sumPy} stroke="#639922" strokeWidth={2} markerEnd="url(#arrowSum)" />}

        <circle cx={uPx} cy={uPy} r={9} fill="#185fa5" stroke="white" strokeWidth={2} className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown("u")} />
        <circle cx={vPx} cy={vPy} r={9} fill="#993c1d" stroke="white" strokeWidth={2} className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown("v")} />
      </svg>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={showParallelogram} onChange={(e) => setShowParallelogram(e.target.checked)} className="accent-navy-600" />
          แสดงรูปสี่เหลี่ยมด้านขนานของ u + v
        </label>

        <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
          <p className="flex justify-between">
            <span className="text-ink-muted">u</span>
            <span className="font-mono text-ink">
              ({u[0]}, {u[1]})
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">v</span>
            <span className="font-mono text-ink">
              ({v[0]}, {v[1]})
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">u + v</span>
            <span className="font-mono text-ink">
              ({sum[0]}, {sum[1]})
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">u · v (ผลคูณเชิงสเกลาร์)</span>
            <span className="font-mono text-ink">{dot}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">|u|</span>
            <span className="font-mono text-ink">{magU.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">|v|</span>
            <span className="font-mono text-ink">{magV.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">มุมระหว่าง u, v</span>
            <span className="font-mono text-ink">{magU && magV ? `${angleDeg.toFixed(1)}°` : "—"}</span>
          </p>
          {perpendicular && <p className="text-success-strong text-xs font-medium">u ตั้งฉากกับ v (u · v = 0)</p>}
        </div>
      </div>
    </div>
  );
}
