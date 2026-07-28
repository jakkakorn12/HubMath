"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AssignmentCategory } from "@/lib/supabase/types";

const CATEGORY_LABEL: Record<AssignmentCategory, string> = {
  practice: "เก็บคะแนน",
  midterm: "กลางภาค",
  final: "ปลายภาค",
  competency: "สมรรถนะ",
};

export type AssignmentOption = {
  id: string;
  title: string;
  display_name: string | null;
  category: AssignmentCategory;
  term: 1 | 2;
  max_score: number;
};

export default function TaskScoreLink({
  taskId,
  assignments,
  initialAssignmentId,
  initialReducedMaxScore,
}: {
  taskId: string;
  assignments: AssignmentOption[];
  initialAssignmentId: string | null;
  initialReducedMaxScore: number | null;
}) {
  const router = useRouter();
  const [assignmentId, setAssignmentId] = useState(initialAssignmentId ?? "");
  const [reducedMaxScore, setReducedMaxScore] = useState(
    initialReducedMaxScore != null ? String(initialReducedMaxScore) : ""
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const reducedNum = reducedMaxScore.trim() === "" ? null : Number(reducedMaxScore);
      if (reducedMaxScore.trim() !== "" && Number.isNaN(reducedNum)) {
        setError("ตัดทอนคะแนนต้องเป็นตัวเลข");
        return;
      }

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          assignment_id: assignmentId || null,
          reduced_max_score: reducedNum,
        })
        .eq("id", taskId);

      if (updateError) {
        setError("บันทึกไม่สำเร็จ: " + updateError.message);
        return;
      }

      if (assignmentId) {
        await fetch("/api/teacher/sync-task-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId }),
        }).catch(() => {});
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-[11px] text-ink-faint mb-1">คะแนนปลายทาง</label>
        <select
          value={assignmentId}
          onChange={(e) => {
            setAssignmentId(e.target.value);
            setDone(false);
          }}
          className="border-[0.5px] border-border rounded-control px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
        >
          <option value="">ไม่เชื่อมกับเกรดบุ๊ค</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.display_name ?? a.title} ({CATEGORY_LABEL[a.category]} · เทอม {a.term} · เต็ม {a.max_score})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] text-ink-faint mb-1">ตัดทอนคะแนนเหลือ</label>
        <input
          type="text"
          inputMode="decimal"
          value={reducedMaxScore}
          onChange={(e) => {
            setReducedMaxScore(e.target.value);
            setDone(false);
          }}
          className="w-24 border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium text-white bg-navy-900 rounded-control px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "..." : done ? "บันทึกแล้ว ✓" : "บันทึก"}
      </button>
      {error && <p className="text-danger-strong text-xs w-full">{error}</p>}
    </div>
  );
}
