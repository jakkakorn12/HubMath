"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Entry = { grade: string; feedback: string };

const AUTOSAVE_DELAY_MS = 600;

function entryKey(v: Entry) {
  return `${v.grade}__${v.feedback}`;
}

export default function GradeForm({
  submissionId,
  initialGrade,
  initialFeedback,
}: {
  submissionId: string;
  initialGrade: number | null;
  initialFeedback: string | null;
}) {
  const router = useRouter();
  const initial: Entry = { grade: initialGrade != null ? String(initialGrade) : "", feedback: initialFeedback ?? "" };
  const [values, setValues] = useState<Entry>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const baselineRef = useRef<Entry>(initial);
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

  function setGrade(grade: string) {
    setValues((prev) => ({ ...prev, grade }));
    setDone(false);
    scheduleSave();
  }

  function setFeedback(feedback: string) {
    setValues((prev) => ({ ...prev, feedback }));
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
      const cur = valuesRef.current;
      if (entryKey(cur) === entryKey(baselineRef.current)) {
        setDone(true);
        return; // ไม่เปลี่ยนจากที่เซฟไว้ล่าสุด
      }

      const gradeNum = cur.grade.trim() === "" ? null : Number(cur.grade);
      if (cur.grade.trim() !== "" && Number.isNaN(gradeNum)) {
        setError("คะแนนต้องเป็นตัวเลข");
        return;
      }

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("task_submissions")
        .update({
          grade: gradeNum,
          feedback: cur.feedback.trim() || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (updateError) {
        setError("บันทึกไม่สำเร็จ: " + updateError.message);
        return;
      }

      baselineRef.current = cur;
      setDone(true);
      router.refresh();
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

  async function handleSaveClick(e: React.FormEvent) {
    e.preventDefault();
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await runSave();
  }

  return (
    <form onSubmit={handleSaveClick} className="mt-3 pt-3 border-t-[0.5px] border-border flex flex-wrap items-start gap-2">
      <div>
        <label className="block text-[11px] text-ink-faint mb-1">คะแนน</label>
        <input
          type="text"
          inputMode="decimal"
          value={values.grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-20 border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-[11px] text-ink-faint mb-1">คอมเมนต์ถึงนักเรียน (ไม่บังคับ)</label>
        <input
          type="text"
          value={values.feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="เช่น ข้อ 3 วิธีทำยังไม่ครบ"
          className="w-full border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div className="pt-[18px]">
        <button
          type="submit"
          disabled={saving}
          className="bg-navy-900 text-white px-3.5 py-1.5 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "..." : done && !error ? "บันทึกแล้ว ✓" : "บันทึก"}
        </button>
      </div>
      {error && <p className="text-danger-strong text-xs w-full">{error}</p>}
    </form>
  );
}
