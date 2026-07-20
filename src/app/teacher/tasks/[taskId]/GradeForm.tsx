"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [grade, setGrade] = useState(initialGrade != null ? String(initialGrade) : "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();

    const gradeNum = grade.trim() === "" ? null : Number(grade);
    if (grade.trim() !== "" && isNaN(gradeNum as number)) {
      setError("คะแนนต้องเป็นตัวเลข");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("task_submissions")
      .update({
        grade: gradeNum,
        feedback: feedback.trim() || null,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateError) {
      setError("บันทึกไม่สำเร็จ: " + updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="mt-3 pt-3 border-t-[0.5px] border-border flex flex-wrap items-start gap-2">
      <div>
        <label className="block text-[11px] text-ink-faint mb-1">คะแนน</label>
        <input
          type="text"
          inputMode="decimal"
          value={grade}
          onChange={(e) => { setGrade(e.target.value); setSaved(false); }}
          className="w-20 border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-[11px] text-ink-faint mb-1">คอมเมนต์ถึงนักเรียน (ไม่บังคับ)</label>
        <input
          type="text"
          value={feedback}
          onChange={(e) => { setFeedback(e.target.value); setSaved(false); }}
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
          {saving ? "..." : saved ? "บันทึกแล้ว ✓" : "บันทึก"}
        </button>
      </div>
      {error && <p className="text-danger-strong text-xs w-full">{error}</p>}
    </form>
  );
}
