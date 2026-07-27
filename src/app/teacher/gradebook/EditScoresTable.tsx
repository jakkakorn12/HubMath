"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sortAssignments, type AssignmentListItem } from "./AssignmentManager";

type StudentRow = { code: string; number: number; name: string };

function cellKey(code: string, assignmentId: string) {
  return `${code}__${assignmentId}`;
}

const AUTOSAVE_DELAY_MS = 200;

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

  // ref เก็บค่าล่าสุดไว้ให้ runSave (ที่อาจถูกเรียกจาก timer เก่า) อ่านค่าปัจจุบันเสมอ ไม่ใช่ค่าตอน schedule
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  function getValue(code: string, assignmentId: string) {
    const key = cellKey(code, assignmentId);
    return values[key] ?? (initialScores[key] != null ? String(initialScores[key]) : "");
  }

  function setValue(code: string, assignmentId: string, v: string) {
    setValues((prev) => ({ ...prev, [cellKey(code, assignmentId)]: v }));
    setDone(false);

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      runSave();
    }, AUTOSAVE_DELAY_MS);
  }

  // รวมทุกช่องที่เปลี่ยนเป็น request เดียวเสมอ ไม่ว่าจะบันทึกอัตโนมัติหรือกดปุ่มเอง
  // (กันปัญหาเดิมที่เคยเจอตอน sync จาก Sheets ที่ยิง 1 request ต่อ 1 ช่องจนระบบค้าง)
  async function runSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const currentValues = valuesRef.current;
      const rows: { student_code: string; assignment_id: string; score: number | null }[] = [];
      for (const s of students) {
        for (const a of sortedAssignments) {
          const key = cellKey(s.code, a.id);
          const current = key in currentValues ? currentValues[key] : (initialScores[key] != null ? String(initialScores[key]) : "");
          const initial = initialScores[key];
          const currentNum = current.trim() === "" ? null : Number(current);
          if (currentNum === initial) continue; // ไม่เปลี่ยน ไม่ต้องส่ง
          if (current.trim() !== "" && Number.isNaN(currentNum)) continue; // กันค่าที่พิมพ์ไม่ใช่ตัวเลข
          rows.push({ student_code: s.code, assignment_id: a.id, score: currentNum });
        }
      }

      if (rows.length === 0) {
        setDone(true);
        return;
      }

      const res = await fetch("/api/teacher/update-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subjectId, rows }),
      });
      const data = await res.json().catch(() => ({ error: "เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง" }));

      if (!res.ok) {
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้) กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  async function handleSaveClick() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await runSave();
  }

  if (sortedAssignments.length === 0) {
    return <p className="text-sm text-ink-faint">ยังไม่มีช่องคะแนน เพิ่มช่องคะแนนด้านบนก่อน</p>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr className="text-ink-muted">
              <th className="sticky top-0 left-0 z-20 bg-surface border border-border px-2 py-1.5 w-9">
                เลขที่
              </th>
              <th className="sticky top-0 left-9 z-20 bg-surface border border-border px-2 py-1.5 text-left min-w-[90px]">
                ชื่อ
              </th>
              {sortedAssignments.map((a) => (
                <th
                  key={a.id}
                  title={a.display_name ?? a.title}
                  className="sticky top-0 z-10 bg-surface border border-border px-1 py-1.5 font-medium w-12"
                >
                  <span className="block truncate max-w-[44px] mx-auto">{a.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.code} className={i % 2 === 1 ? "bg-surface/40" : undefined}>
                <td className="sticky left-0 z-10 bg-white border border-border px-2 py-1 text-ink-faint" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  {s.number || "—"}
                </td>
                <td className="sticky left-9 z-10 bg-white border border-border px-2 py-1 text-left text-ink whitespace-nowrap" style={i % 2 === 1 ? { background: "var(--color-surface)" } : undefined}>
                  <span className="block">{s.name}</span>
                  <span className="block text-[10px] text-ink-faint font-normal">{s.code}</span>
                </td>
                {sortedAssignments.map((a) => (
                  <td key={a.id} className="border border-border px-0.5 py-1">
                    <input
                      type="number"
                      min={0}
                      max={a.max_score}
                      value={getValue(s.code, a.id)}
                      onChange={(e) => setValue(s.code, a.id, e.target.value)}
                      className="w-10 text-center border-[0.5px] border-border rounded-control px-0.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
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
          onClick={handleSaveClick}
          disabled={saving || students.length === 0}
          className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
        </button>
        {error && <p className="text-danger-strong text-sm">{error}</p>}
        {done && !error && !saving && <p className="text-success-strong text-sm">บันทึกแล้ว (บันทึกอัตโนมัติเปิดอยู่)</p>}
      </div>
    </div>
  );
}
