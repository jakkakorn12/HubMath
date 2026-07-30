"use client";

import { MathText } from "./mathMarkup";
import type { SheetEntry } from "./types";

export default function FormulaSheet({ sheet, topicName }: { sheet: SheetEntry[]; topicName: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-ink-faint">สรุปสูตร — พิมพ์แจกนักเรียนได้</p>
        <button
          onClick={() => window.print()}
          className="text-xs font-medium text-navy-600 border-[0.5px] border-border rounded-control px-3 py-1.5 hover:bg-surface"
        >
          พิมพ์หน้านี้
        </button>
      </div>

      <div id="formula-sheet-print" className="bg-white rounded-card border-[0.5px] border-border p-6">
        <h3 className="text-lg font-bold text-ink mb-4">สรุปสูตร: {topicName}</h3>
        <div className="divide-y divide-border">
          {sheet.map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-4">
              <span className="text-sm text-ink-muted">{entry.name}</span>
              <span className="font-mono text-sm text-navy-900">
                <MathText text={entry.formula} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #formula-sheet-print,
          #formula-sheet-print * {
            visibility: visible;
          }
          #formula-sheet-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
