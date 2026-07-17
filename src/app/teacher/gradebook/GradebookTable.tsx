"use client";

import { useMemo, useState } from "react";

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

export default function GradebookTable({
  rows,
  colLabels,
}: {
  rows: GradebookRow[];
  colLabels: string[];
}) {
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
        className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto max-h-[70vh]">
        <table className="w-full text-sm text-center border-separate border-spacing-0 min-w-[640px]">
          <thead>
            <tr className="text-gray-600">
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 w-12">เลขที่</th>
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left">ชื่อ</th>
              {colLabels.map((label) => (
                <th key={label} className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 font-medium whitespace-nowrap">
                  {label}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-2 py-2 font-semibold">รวม/100</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code}>
                <td className="border-b border-gray-100 px-2 py-2 text-gray-500">{r.number || "—"}</td>
                <td className="border-b border-gray-100 px-3 py-2 text-left text-gray-800">{r.name}</td>
                {COL_KEYS.map((key) => (
                  <td key={key} className="border-b border-gray-100 px-2 py-2 text-gray-700">
                    {r[key].has ? r[key].sum : "—"}
                  </td>
                ))}
                <td className="border-b border-gray-100 px-2 py-2 font-bold text-blue-700 bg-blue-50">
                  {r.anyScore ? r.total : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colLabels.length + 3} className="px-3 py-6 text-gray-400">
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
