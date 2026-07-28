"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AssignmentCategory } from "@/lib/supabase/types";
import SubmissionCard from "./SubmissionCard";

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

export type SubmissionProps = {
  submissionId: string;
  roomName: string;
  number: number;
  studentName: string | undefined;
  studentCode: string | undefined;
  initialGrade: number | null;
  initialFeedback: string | null;
  matches: { name: string; percent: number }[];
  fileName: string | null;
  fileLink: string | undefined;
  content: string | null;
  submittedAt: string;
};

const AUTOSAVE_DELAY_MS = 300;

type LinkValues = { assignmentId: string; maxScore: string; reducedMaxScore: string };

function entryKey(v: LinkValues) {
  return `${v.assignmentId}__${v.maxScore}__${v.reducedMaxScore}`;
}

export default function TaskGradingArea({
  taskId,
  assignments,
  initialAssignmentId,
  initialMaxScore,
  initialReducedMaxScore,
  submissions,
  emptyLabel,
  dueDate,
}: {
  taskId: string;
  assignments: AssignmentOption[];
  initialAssignmentId: string | null;
  initialMaxScore: number | null;
  initialReducedMaxScore: number | null;
  submissions: SubmissionProps[];
  emptyLabel: string;
  dueDate: string | null;
}) {
  const initial: LinkValues = {
    assignmentId: initialAssignmentId ?? "",
    maxScore: initialMaxScore != null ? String(initialMaxScore) : "",
    reducedMaxScore: initialReducedMaxScore != null ? String(initialReducedMaxScore) : "",
  };
  const [values, setValues] = useState<LinkValues>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const baselineRef = useRef<LinkValues>(initial);
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

  function setAssignmentId(assignmentId: string) {
    setValues((prev) => ({ ...prev, assignmentId }));
    setDone(false);
    scheduleSave();
  }

  function setMaxScore(maxScore: string) {
    setValues((prev) => ({ ...prev, maxScore }));
    setDone(false);
    scheduleSave();
  }

  function setReducedMaxScore(reducedMaxScore: string) {
    setValues((prev) => ({ ...prev, reducedMaxScore }));
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
        return;
      }

      const maxNum = cur.maxScore.trim() === "" ? null : Number(cur.maxScore);
      if (cur.maxScore.trim() !== "" && Number.isNaN(maxNum)) {
        setError("คะแนนเต็มต้องเป็นตัวเลข");
        return;
      }
      const reducedNum = cur.reducedMaxScore.trim() === "" ? null : Number(cur.reducedMaxScore);
      if (cur.reducedMaxScore.trim() !== "" && Number.isNaN(reducedNum)) {
        setError("ตัดทอนคะแนนต้องเป็นตัวเลข");
        return;
      }

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ assignment_id: cur.assignmentId || null, max_score: maxNum, reduced_max_score: reducedNum })
        .eq("id", taskId);

      if (updateError) {
        setError("บันทึกไม่สำเร็จ: " + updateError.message);
        return;
      }

      if (cur.assignmentId) {
        fetch("/api/teacher/sync-task-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId }),
        }).catch((e) => console.error("sync-task-score failed", e));
      }

      baselineRef.current = cur;
      setDone(true);
    } catch {
      setError("บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้)");
    } finally {
      setSaving(false);
      savingRef.current = false;
      if (pendingResaveRef.current) {
        pendingResaveRef.current = false;
        runSave();
      }
    }
  }

  const liveAssignmentId = values.assignmentId || null;
  const liveMaxScore = values.maxScore.trim() === "" ? null : Number(values.maxScore);
  const liveReducedMaxScore = values.reducedMaxScore.trim() === "" ? null : Number(values.reducedMaxScore);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">
          ส่งแล้ว <span className="text-ink-faint font-normal">({submissions.length} คน)</span>
          {dueDate && (
            <span className="text-sm text-ink-faint font-normal">
              {" "}
              · กำหนดส่ง {new Date(dueDate).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] text-ink-faint mb-1">คะแนนปลายทาง</label>
            <select
              value={values.assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
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
            <label className="block text-[11px] text-ink-faint mb-1">คะแนนเต็ม (ก่อนตัดทอน)</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-24 border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-[11px] text-ink-faint mb-1">ตัดทอนคะแนนเหลือ</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.reducedMaxScore}
              onChange={(e) => setReducedMaxScore(e.target.value)}
              className="w-24 border-[0.5px] border-border rounded-control px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <span className="text-xs text-ink-faint pb-1.5 whitespace-nowrap">
            {saving ? "กำลังบันทึก..." : done && !error ? "บันทึกแล้ว ✓" : ""}
          </span>
        </div>
      </div>
      {error && <p className="text-danger-strong text-xs">{error}</p>}

      {submissions.length === 0 ? (
        <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
          {emptyLabel}
        </div>
      ) : (
        submissions.map((s) => (
          <SubmissionCard
            key={s.submissionId}
            submissionId={s.submissionId}
            roomName={s.roomName}
            number={s.number}
            studentName={s.studentName}
            studentCode={s.studentCode}
            initialGrade={s.initialGrade}
            initialFeedback={s.initialFeedback}
            assignmentId={liveAssignmentId}
            maxScore={liveMaxScore}
            reducedMaxScore={liveReducedMaxScore}
            matches={s.matches}
            fileName={s.fileName}
            fileLink={s.fileLink}
            content={s.content}
            submittedAt={s.submittedAt}
            dueDate={dueDate}
          />
        ))
      )}
    </>
  );
}
