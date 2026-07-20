"use client";

import { useMemo, useState } from "react";

export type StudentRow = {
  code: string;
  number: number;
  name: string;
  registered: boolean;
};

export default function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อ หรือเลขประจำตัว..."
        className="w-full sm:w-72 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
      />

      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-ink-muted text-left">
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2 w-14 text-center">เลขที่</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2">ชื่อ</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2">เลขประจำตัว</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code} className="hover:bg-surface transition-colors">
                <td className="border-b-[0.5px] border-border px-3 py-2 text-center text-ink-faint">{r.number || "—"}</td>
                <td className="border-b-[0.5px] border-border px-3 py-2 text-ink">{r.name}</td>
                <td className="border-b-[0.5px] border-border px-3 py-2 text-ink-faint">{r.code}</td>
                <td className="border-b-[0.5px] border-border px-3 py-2 text-center">
                  {r.registered ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-success-soft text-success-strong">สมัครแล้ว</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface text-ink-faint">ยังไม่สมัคร</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink-faint">
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
