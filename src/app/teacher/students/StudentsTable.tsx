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
        className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto max-h-[70vh]">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-gray-600 text-left">
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 w-14 text-center">เลขที่</th>
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2">ชื่อ</th>
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2">เลขประจำตัว</th>
              <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code}>
                <td className="border-b border-gray-100 px-3 py-2 text-center text-gray-500">{r.number || "—"}</td>
                <td className="border-b border-gray-100 px-3 py-2 text-gray-800">{r.name}</td>
                <td className="border-b border-gray-100 px-3 py-2 text-gray-500">{r.code}</td>
                <td className="border-b border-gray-100 px-3 py-2 text-center">
                  {r.registered ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">สมัครแล้ว</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">ยังไม่สมัคร</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
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
