"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AttendanceStatus } from "@/lib/supabase/types";

const STATUS_LETTER: Record<AttendanceStatus, string> = {
  present: "ม", late: "ส", absent: "ข", truant: "น", excused_activity: "ขร",
  leave: "ล", sick_leave: "ลป", personal_leave: "ลก", field_trip: "ทศ", school_holiday: "หพ",
};
const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present: "text-success-strong",
  late: "text-warning-strong",
  absent: "text-danger-strong font-semibold",
  truant: "text-danger-strong font-semibold",
  excused_activity: "text-success-strong",
  leave: "text-ink-faint",
  sick_leave: "text-ink-faint",
  personal_leave: "text-ink-faint",
  field_trip: "text-ink-faint",
  school_holiday: "text-ink-faint",
};

export type AttendanceReportRow = {
  code: string;
  number: number;
  name: string;
  byDate: Record<string, AttendanceStatus | null>;
  notesByDate: Record<string, string | null>;
  percentage: number | null;
  eligible: boolean | null;
};

function formatDateLabel(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
}

export default function AttendanceReport({
  dates,
  rows,
  fileName,
}: {
  dates: string[];
  rows: AttendanceReportRow[];
  fileName: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.includes(q));
  }, [rows, search]);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["เลขที่", "เลขประจำตัว", "ชื่อ", ...dates.map(formatDateLabel), "ร้อยละ", "สิทธิ์การเข้าสอบ"];
    const lines = rows.map((r) =>
      [
        r.number || "",
        r.code,
        r.name,
        ...dates.map((d) => (r.byDate[d] ? STATUS_LETTER[r.byDate[d]!] : "")),
        r.percentage != null ? r.percentage : "",
        r.eligible == null ? "" : r.eligible ? "มี" : "ไม่มี",
      ].map(esc).join(",")
    );
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
      </div>

      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="text-sm text-center border-collapse">
          <thead>
            <tr className="text-ink-muted">
              <th className="sticky top-0 left-0 z-20 bg-surface border border-border px-2 py-2 w-10">เลขที่</th>
              <th className="sticky top-0 left-10 z-20 bg-surface border border-border px-3 py-2 text-left min-w-[110px]">ชื่อ</th>
              {dates.map((d) => (
                <th key={d} className="sticky top-0 z-10 bg-surface border border-border px-1 py-2 w-10 whitespace-nowrap font-normal text-xs">
                  {formatDateLabel(d)}
                </th>
              ))}
              <th className="sticky top-0 right-24 z-20 bg-navy-100 border border-border px-2 py-2 w-20 text-navy-900 font-semibold whitespace-nowrap">
                มาเรียนร้อยละ
              </th>
              <th className="sticky top-0 right-0 z-20 bg-navy-100 border border-border px-2 py-2 w-24 text-navy-900 font-semibold whitespace-nowrap">
                สิทธิ์การเข้าสอบ
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.code} className={i % 2 === 1 ? "bg-surface/40" : undefined}>
                <td className="sticky left-0 z-10 bg-white border border-border px-2 py-1.5 text-ink-faint" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  {r.number || "—"}
                </td>
                <td className="sticky left-10 z-10 bg-white border border-border px-3 py-1.5 text-left text-ink whitespace-nowrap" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  <span className="block">{r.name}</span>
                  <span className="block text-[10px] text-ink-faint font-normal">{r.code}</span>
                </td>
                {dates.map((d) => {
                  const st = r.byDate[d];
                  const note = r.notesByDate[d];
                  return (
                    <td
                      key={d}
                      title={note ?? undefined}
                      className={`border border-border px-1 py-1.5 ${st ? STATUS_CHIP[st] : "text-border"} ${note ? "underline decoration-dotted cursor-help" : ""}`}
                    >
                      {st ? STATUS_LETTER[st] : "—"}
                    </td>
                  );
                })}
                <td className="sticky right-24 z-10 bg-navy-100 border border-border px-2 py-1.5 font-bold text-navy-900">
                  {r.percentage != null ? `${r.percentage}%` : "—"}
                </td>
                <td className="sticky right-0 z-10 bg-navy-100 border border-border px-2 py-1.5 font-medium">
                  {r.eligible == null ? (
                    <span className="text-ink-faint">—</span>
                  ) : r.eligible ? (
                    <span className="text-navy-900">มีสิทธิ์</span>
                  ) : (
                    <span className="text-danger-strong">ไม่มีสิทธิ์</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={dates.length + 4} className="px-3 py-6 text-ink-faint">
                  {search ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีข้อมูลการเช็คชื่อ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-faint">
        มาเรียนร้อยละ = (จำนวนวันมา + สาย) ÷ (วันเรียนทั้งหมด − วันลา/ทัศนศึกษา/หยุดพิเศษ) × 100 · มีสิทธิ์สอบถ้าร้อยละ ≥ 80 · วันที่ไม่มีการเช็คชื่อนับเป็นวันขาด · วางเมาส์บนช่องที่มีขีดเส้นใต้เพื่อดูหมายเหตุ
      </p>
    </div>
  );
}
