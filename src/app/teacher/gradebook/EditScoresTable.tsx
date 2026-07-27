"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sortAssignments, type AssignmentListItem } from "./AssignmentManager";

type StudentRow = { code: string; number: number; name: string };

const CATEGORY_LABEL: Record<string, string> = {
  practice: "เก็บคะแนน", midterm: "กลางภาค", final: "ปลายภาค", competency: "สมรรถนะ",
};

function cellKey(code: string, assignmentId: string) {
  return `${code}__${assignmentId}`;
}

export default function EditScoresTable({
  subjectId,
  assignments,
  students,
  initialScores,
}: {
  subjectId: string;
  assignments: AssignmentListItem[];
  students: StudentRow[];
  initialScores: Record<string, number | null>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [key, score] of Object.entries(initialScores)) {
      init[key] = score == null ? "" : String(score);
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments]);
  const term1Assignments = useMemo(() => sortedAssignments.filter((a) => a.term === 1), [sortedAssignments]);
  const term2Assignments = useMemo(() => sortedAssignments.filter((a) => a.term === 2), [sortedAssignments]);

  function getValue(code: string, assignmentId: string) {
    const key = cellKey(code, assignmentId);
    return values[key] ?? (initialScores[key] != null ? String(initialScores[key]) : "");
  }

  function setValue(code: string, assignmentId: string, v: string) {
    setValues((prev) => ({ ...prev, [cellKey(code, assignmentId)]: v }));
    setDone(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const rows: { student_code: string; assignment_id: string; score: number | null }[] = [];
    for (const s of students) {
      for (const a of sortedAssignments) {
        const key = cellKey(s.code, a.id);
        const current = key in values ? values[key] : (initialScores[key] != null ? String(initialScores[key]) : "");
        const initial = initialScores[key];
        const currentNum = current.trim() === "" ? null : Number(current);
        if (currentNum === initial) continue; // ไม่เปลี่ยน ไม่ต้องส่ง
        if (current.trim() !== "" && Number.isNaN(currentNum)) continue; // กันค่าที่พิมพ์ไม่ใช่ตัวเลข
        rows.push({ student_code: s.code, assignment_id: a.id, score: currentNum });
      }
    }

    if (rows.length === 0) {
      setSaving(false);
      setDone(true);
      return;
    }

    const res = await fetch("/api/teacher/update-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_id: subjectId, rows }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "บันทึกไม่สำเร็จ");
      setSaving(false);
      return;
    }

    setSaving(false);
    setDone(true);
    router.refresh();
  }

  if (sortedAssignments.length === 0) {
    return <p className="text-sm text-ink-faint">ยังไม่มีช่องคะแนน เพิ่มช่องคะแนนด้านบนก่อน</p>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm text-center border-collapse min-w-[640px]">
          <thead>
            <tr className="text-ink-muted">
              <th rowSpan={2} className="sticky top-0 left-0 z-20 bg-surface border border-border px-2 py-1.5 w-10">
                เลขที่
              </th>
              <th rowSpan={2} className="sticky top-0 left-10 z-20 bg-surface border border-border px-3 py-1.5 text-left min-w-[110px]">
                ชื่อ
              </th>
              {term1Assignments.length > 0 && (
                <th colSpan={term1Assignments.length} className="sticky top-0 z-10 bg-navy-100 border border-border px-2 py-1 text-xs font-semibold text-navy-900">
                  เทอม 1
                </th>
              )}
              {term2Assignments.length > 0 && (
                <th colSpan={term2Assignments.length} className="sticky top-0 z-10 bg-navy-100 border border-border px-2 py-1 text-xs font-semibold text-navy-900">
                  เทอม 2
                </th>
              )}
            </tr>
            <tr className="text-ink-muted">
              {sortedAssignments.map((a) => {
                const name = a.display_name ?? a.title;
                return (
                  <th
                    key={a.id}
                    title={name}
                    className="sticky top-[29px] z-10 bg-surface border border-border px-1.5 py-1.5 font-medium w-20"
                  >
                    <span className="block truncate max-w-[76px] mx-auto">{name}</span>
                    <span className="block text-[10px] text-ink-faint font-normal">
                      {CATEGORY_LABEL[a.category]} · /{a.max_score}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.code} className={i % 2 === 1 ? "bg-surface/40" : undefined}>
                <td className="sticky left-0 z-10 bg-white border border-border px-2 py-1 text-ink-faint" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  {s.number || "—"}
                </td>
                <td className="sticky left-10 z-10 bg-white border border-border px-3 py-1 text-left text-ink whitespace-nowrap" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  {s.name}
                </td>
                {sortedAssignments.map((a) => (
                  <td key={a.id} className="border border-border px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      max={a.max_score}
                      value={getValue(s.code, a.id)}
                      onChange={(e) => setValue(s.code, a.id, e.target.value)}
                      className="w-14 text-center border-[0.5px] border-border rounded-control px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={sortedAssignments.length + 2} className="px-3 py-6 text-ink-faint">
                  ยังไม่มีนักเรียนในห้องนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
        </button>
        {error && <p className="text-danger-strong text-sm">{error}</p>}
        {done && !error && <p className="text-success-strong text-sm">บันทึกแล้ว</p>}
      </div>
    </div>
  );
}
