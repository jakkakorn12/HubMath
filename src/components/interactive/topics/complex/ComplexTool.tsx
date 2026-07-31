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

export default function ComplexTool() {
  const [z, setZ] = useState<[number, number]>([3, 2]);
  const [r, setR] = useState(1);
  const [thetaDeg, setThetaDeg] = useState(90);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg || !draggingRef.current) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * SIZE;
    const py = ((clientY - rect.top) / rect.height) * SIZE;
    const [x, y] = fromSvg(px, py);
    setZ([clampGrid(x), clampGrid(y)]);
  }, []);

  function onPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  const theta = (thetaDeg * Math.PI) / 180;
  const wx = r * Math.cos(theta);
  const wy = r * Math.sin(theta);
  const [zx, zy] = z;
  const productX = zx * wx - zy * wy;
  const productY = zx * wy + zy * wx;

  const magZ = Math.hypot(zx, zy);
  const argZDeg = (Math.atan2(zy, zx) * 180) / Math.PI;
  const magProduct = magZ * r;
  const argProductDeg = argZDeg + thetaDeg;

  const [zPx, zPy] = toSvg(zx, zy);
  const [pPx, pPy] = toSvg(productX, productY);

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
          <marker id="arrowCZ" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#185fa5" />
          </marker>
          <marker id="arrowCP" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
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

        <line x1={CENTER} y1={CENTER} x2={zPx} y2={zPy} stroke="#185fa5" strokeWidth={2} markerEnd="url(#arrowCZ)" />
        <line x1={CENTER} y1={CENTER} x2={pPx} y2={pPy} stroke="#639922" strokeWidth={2} strokeDasharray="5 3" markerEnd="url(#arrowCP)" />

        <circle cx={zPx} cy={zPy} r={9} fill="#185fa5" stroke="white" strokeWidth={2} className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown} />
      </svg>

      <div className="space-y-3">
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>r (ขนาดตัวคูณ)</span>
            <span className="font-mono text-navy-600">{r.toFixed(1)}</span>
          </label>
          <input type="range" min={0.2} max={2} step={0.1} value={r} onChange={(e) => setR(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>
        <div>
          <label className="flex justify-between text-sm text-ink mb-1">
            <span>θ (มุมหมุน)</span>
            <span className="font-mono text-navy-600">{thetaDeg}°</span>
          </label>
          <input type="range" min={0} max={345} step={15} value={thetaDeg} onChange={(e) => setThetaDeg(Number(e.target.value))} className="w-full accent-navy-600" />
        </div>

        <div className="bg-surface rounded-control p-4 space-y-1.5 text-sm">
          <p className="flex justify-between">
            <span className="text-ink-muted">z</span>
            <span className="font-mono text-ink">
              {zx} {zy >= 0 ? "+" : "−"} {Math.abs(zy)}i
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">|z|</span>
            <span className="font-mono text-ink">{magZ.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">arg(z)</span>
            <span className="font-mono text-ink">{argZDeg.toFixed(1)}°</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">w = r(cos θ + i sin θ)</span>
            <span className="font-mono text-ink">
              {r.toFixed(1)} ∠{thetaDeg}°
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">z × w</span>
            <span className="font-mono text-ink">
              {productX.toFixed(2)} {productY >= 0 ? "+" : "−"} {Math.abs(productY).toFixed(2)}i
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">|z × w|</span>
            <span className="font-mono text-ink">{magProduct.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-muted">arg(z × w)</span>
            <span className="font-mono text-ink">{argProductDeg.toFixed(1)}°</span>
          </p>
        </div>
        <p className="text-xs text-ink-faint">คูณด้วย w คือการหมุน z ไป θ องศา แล้วขยาย/หดขนาดเป็น r เท่า</p>
      </div>
    </div>
  );
}
