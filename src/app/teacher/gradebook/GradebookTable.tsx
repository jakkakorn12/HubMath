"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";

type Bucket = { sum: number; has: boolean };
export type GradebookRow = {
  code: string;
  number: number;
  name: string;
  keep1: Bucket;
  mid: Bucket;
  keep2: Bucket;
  comp: Bucket;
  fin: Bucket;
  anyScore: boolean;
  total: number;
};

const COL_KEYS = ["keep1", "mid", "keep2", "comp", "fin"] as const;

// ปัดแค่ตอนแสดงผล กันเศษทศนิยมเพี้ยนจากการบวกเลขทศนิยมของ JS (เช่น 18.880000000000003)
function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

export default function GradebookTable({
  rows,
  colLabels,
  fileName,
  sheetUrl,
}: {
  rows: GradebookRow[];
  colLabels: string[];
  fileName: string;
  sheetUrl: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.includes(q)
    );
  }, [rows, search]);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["เลขที่", "เลขประจำตัว", "ชื่อ", ...colLabels, "รวม/100"];
    const lines = rows.map((r) =>
      [
        r.number || "",
        r.code,
        r.name,
        ...COL_KEYS.map((k) => (r[k].has ? fmt(r[k].sum) : "")),
        r.anyScore ? fmt(r.total) : "",
      ].map(esc).join(",")
    );
    // ﻿ (BOM) เพื่อให้ Excel เปิดภาษาไทยไม่เพี้ยน
    const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ หรือเลขประจำตัว..."
          className="w-full sm:w-72 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink border-[0.5px] border-border rounded-control px-3 py-2 bg-white hover:bg-surface transition-colors"
        >
          <Download className="w-4 h-4" />
          ดาวน์โหลด Excel (CSV)
        </button>
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink border-[0.5px] border-border rounded-control px-3 py-2 bg-white hover:bg-surface transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          เปิด Google Sheets
        </a>
      </div>

      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm text-center border-separate border-spacing-0 min-w-[640px]">
          <thead>
            <tr className="text-ink-muted">
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 w-12">เลขที่</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2 text-left">ชื่อ</th>
              {colLabels.map((label) => (
                <th key={label} className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 font-medium whitespace-nowrap">
                  {label}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-navy-100 border-b-[0.5px] border-border px-2 py-2 font-semibold text-navy-900">รวม/100</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code} className="hover:bg-surface transition-colors">
                <td className="border-b-[0.5px] border-border px-2 py-2 text-ink-faint">{r.number || "—"}</td>
                <td className="border-b-[0.5px] border-border px-3 py-2 text-left text-ink">{r.name}</td>
                {COL_KEYS.map((key) => (
                  <td key={key} className="border-b-[0.5px] border-border px-2 py-2 text-ink-muted">
                    {r[key].has ? fmt(r[key].sum) : "—"}
                  </td>
                ))}
                <td className="border-b-[0.5px] border-border px-2 py-2 font-bold text-navy-900 bg-navy-100">
                  {r.anyScore ? fmt(r.total) : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colLabels.length + 3} className="px-3 py-6 text-ink-faint">
                  {search ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีนักเรียนในห้องนี้"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
