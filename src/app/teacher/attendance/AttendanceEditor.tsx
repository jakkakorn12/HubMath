"use client";

import { useEffect, useRef, useState } from "react";
import type { AttendanceStatus } from "@/lib/supabase/types";

type StudentRow = { code: string; number: number; name: string };
type EntryValue = { status: AttendanceStatus | ""; note: string };

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "มา", late: "สาย", absent: "ขาด", truant: "หนีเรียน",
  leave: "ลา", sick_leave: "ลาป่วย", personal_leave: "ลากิจ",
  field_trip: "ทัศนศึกษา", school_holiday: "หยุดพิเศษ",
};
// "leave" (เดิม) ไม่เสนอในตัวเลือกใหม่แล้ว — ใช้ ลาป่วย/ลากิจ ที่ละเอียดกว่าแทน
const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "absent", "truant", "sick_leave", "personal_leave", "field_trip", "school_holiday"];

const AUTOSAVE_DELAY_MS = 300;

function entryKey(v: EntryValue) {
  return `${v.status}__${v.note}`;
}

export default function AttendanceEditor({
  sectionId,
  date,
  students,
  initialStatuses,
  initialNotes,
}: {
  sectionId: string;
  date: string;
  students: StudentRow[];
  initialStatuses: Record<string, AttendanceStatus | null>;
  initialNotes: Record<string, string | null>;
}) {
  const [values, setValues] = useState<Record<string, EntryValue>>(() => {
    const init: Record<string, EntryValue> = {};
    for (const s of students) {
      init[s.code] = { status: initialStatuses[s.code] ?? "", note: initialNotes[s.code] ?? "" };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // baseline = ค่าจริงตอนโหลดหน้า (หลัง dedupe QR/ครูแล้ว) ไม่ใช่แค่แถวที่ครูเคยกรอกเอง
  // กันไม่ให้ resave ทุกคนที่เช็ค QR มาแล้วทั้งที่ครูไม่ได้แตะช่องนั้นเลย
  const baselineRef = useRef<Record<string, EntryValue>>(
    Object.fromEntries(
      students.map((s) => [s.code, { status: initialStatuses[s.code] ?? "", note: initialNotes[s.code] ?? "" }])
    )
  );

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingResaveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  function scheduleSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (savingRef.current) {
        pendingResaveRef.current = true;
        return;
      }
      runSave();
    }, AUTOSAVE_DELAY_MS);
  }

  function setStatus(code: string, status: AttendanceStatus | "") {
    setValues((prev) => ({ ...prev, [code]: { status, note: status ? prev[code]?.note ?? "" : "" } }));
    setDone(false);
    scheduleSave();
  }

  function setNote(code: string, note: string) {
    setValues((prev) => ({ ...prev, [code]: { status: prev[code]?.status ?? "", note } }));
    setDone(false);
    scheduleSave();
  }

  function markAllUncheckedPresent() {
    setValues((prev) => {
      const next = { ...prev };
      for (const s of students) {
        if (!next[s.code]?.status) next[s.code] = { status: "present", note: next[s.code]?.note ?? "" };
      }
      return next;
    });
    setDone(false);
    scheduleSave();
  }

  async function runSave() {
    if (savingRef.current) {
      pendingResaveRef.current = true;
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const current = valuesRef.current;
      const baseline = baselineRef.current;
      const rows: { student_code: string; status: AttendanceStatus | null; note: string | null }[] = [];
      for (const s of students) {
        const cur = current[s.code] ?? { status: "", note: "" };
        const base = baseline[s.code] ?? { status: "", note: "" };
        if (entryKey(cur) === entryKey(base)) continue; // ไม่เปลี่ยนจากที่เซฟไว้ล่าสุด
        rows.push({
          student_code: s.code,
          status: cur.status === "" ? null : cur.status,
          note: cur.note.trim() === "" ? null : cur.note.trim(),
        });
      }

      if (rows.length === 0) {
        setDone(true);
        return;
      }

      const res = await fetch("/api/teacher/update-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, date, rows }),
      });
      const data = await res.json().catch(() => ({ error: "เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง" }));

      if (!res.ok) {
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }

      for (const r of rows) {
        baselineRef.current[r.student_code] = { status: r.status ?? "", note: r.note ?? "" };
      }
      setDone(true);
    } catch {
      setError("บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้) กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
      savingRef.current = false;
      if (pendingResaveRef.current) {
        pendingResaveRef.current = false;
        runSave();
      }
    }
  }

  async function handleSaveClick() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await runSave();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={markAllUncheckedPresent}
          className="text-sm font-medium text-navy-600 hover:underline"
        >
          ทำเครื่องหมายมาทั้งหมด (เฉพาะคนที่ยังไม่เช็ค)
        </button>
      </div>

      <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-ink-muted">
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 w-12 text-center">เลขที่</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2 text-left">ชื่อ</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 w-36 text-center">สถานะ</th>
              <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 text-left min-w-[160px]">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.code} className={i % 2 === 1 ? "bg-surface/40" : undefined}>
                <td className="border-b-[0.5px] border-border px-2 py-1.5 text-ink-faint text-center">{s.number || "—"}</td>
                <td className="border-b-[0.5px] border-border px-3 py-1.5 text-left text-ink">
                  <span className="block">{s.name}</span>
                  <span className="block text-[10px] text-ink-faint font-normal">{s.code}</span>
                </td>
                <td className="border-b-[0.5px] border-border px-2 py-1.5 text-center">
                  <select
                    value={values[s.code]?.status ?? ""}
                    onChange={(e) => setStatus(s.code, e.target.value as AttendanceStatus | "")}
                    className="w-full border-[0.5px] border-border rounded-control px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  >
                    <option value="">ยังไม่เช็ค</option>
                    {STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="border-b-[0.5px] border-border px-2 py-1.5">
                  <input
                    type="text"
                    value={values[s.code]?.note ?? ""}
                    onChange={(e) => setNote(s.code, e.target.value)}
                    disabled={!values[s.code]?.status}
                    placeholder={values[s.code]?.status ? "บันทึกเพิ่มเติม..." : "เลือกสถานะก่อน"}
                    className="w-full border-[0.5px] border-border rounded-control px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 disabled:bg-surface disabled:text-ink-faint"
                  />
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-ink-faint">ยังไม่มีนักเรียนในห้องนี้</td>
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
          {saving ? "กำลังบันทึก..." : "บันทึกการเช็คชื่อ"}
        </button>
        {error && <p className="text-danger-strong text-sm">{error}</p>}
        {done && !error && !saving && <p className="text-success-strong text-sm">บันทึกแล้ว (บันทึกอัตโนมัติเปิดอยู่)</p>}
      </div>
    </div>
  );
}
