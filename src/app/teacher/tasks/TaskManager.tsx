"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database, AssignmentCategory } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

type AssignmentOption = {
  id: string;
  title: string;
  display_name: string | null;
  category: AssignmentCategory;
  term: 1 | 2;
  max_score: number;
};

const CATEGORY_LABEL: Record<AssignmentCategory, string> = {
  practice: "เก็บคะแนน",
  midterm: "กลางภาค",
  final: "ปลายภาค",
  competency: "สมรรถนะ",
};

async function syncTaskScore(taskId: string) {
  await fetch("/api/teacher/sync-task-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId }),
  }).catch(() => {});
}

// ISO string → ค่าสำหรับ input datetime-local
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TaskManager({
  subjectId,
  sectionId,
  targetLabel,
  tasks,
  submissionCounts,
  roomNameById,
  assignments,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  tasks: Task[];
  submissionCounts: Record<string, number>;
  roomNameById: Record<string, string>;
  assignments: AssignmentOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [reducedMaxScore, setReducedMaxScore] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // แก้ไขงานที่มีอยู่ (ไม่ต้องลบ-สร้างใหม่ งานที่ส่งแล้วไม่หาย)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignmentId, setEditAssignmentId] = useState("");
  const [editMaxScore, setEditMaxScore] = useState("");
  const [editReducedMaxScore, setEditReducedMaxScore] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function assignmentLabel(id: string) {
    const a = assignments.find((x) => x.id === id);
    if (!a) return null;
    return `${a.display_name ?? a.title} (${CATEGORY_LABEL[a.category]} · เทอม ${a.term} · เต็ม ${a.max_score})`;
  }

  function startEdit(t: Task) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    setEditDueDate(toLocalInput(t.due_date));
    setEditAssignmentId(t.assignment_id ?? "");
    setEditMaxScore(t.max_score != null ? String(t.max_score) : "");
    setEditReducedMaxScore(t.reduced_max_score != null ? String(t.reduced_max_score) : "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    const editMaxNum = editMaxScore.trim() === "" ? null : Number(editMaxScore);
    if (editMaxScore.trim() !== "" && Number.isNaN(editMaxNum)) {
      setError("คะแนนเต็มต้องเป็นตัวเลข");
      return;
    }
    const reducedNum = editReducedMaxScore.trim() === "" ? null : Number(editReducedMaxScore);
    if (editReducedMaxScore.trim() !== "" && Number.isNaN(reducedNum)) {
      setError("ตัดทอนคะแนนต้องเป็นตัวเลข");
      return;
    }
    setSavingEdit(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        assignment_id: editAssignmentId || null,
        max_score: editMaxNum,
        reduced_max_score: reducedNum,
      })
      .eq("id", editingId);
    setSavingEdit(false);
    if (updateError) {
      setError("แก้ไขไม่สำเร็จ: " + updateError.message);
      return;
    }
    if (editAssignmentId) await syncTaskScore(editingId);
    setEditingId(null);
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setError("กรุณาเลือกวิชาก่อน");
      return;
    }
    if (!title.trim()) return;
    const maxNum = maxScore.trim() === "" ? null : Number(maxScore);
    if (maxScore.trim() !== "" && Number.isNaN(maxNum)) {
      setError("คะแนนเต็มต้องเป็นตัวเลข");
      return;
    }
    const reducedNum = reducedMaxScore.trim() === "" ? null : Number(reducedMaxScore);
    if (reducedMaxScore.trim() !== "" && Number.isNaN(reducedNum)) {
      setError("ตัดทอนคะแนนต้องเป็นตัวเลข");
      return;
    }
    setCreating(true);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("tasks").insert({
      subject_id: subjectId,
      section_id: sectionId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assignment_id: assignmentId || null,
      max_score: maxNum,
      reduced_max_score: reducedNum,
    });

    if (insertError) {
      setError("สร้างงานไม่สำเร็จ: " + insertError.message);
      setCreating(false);
      return;
    }

    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignmentId("");
    setMaxScore("");
    setReducedMaxScore("");
    setCreating(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!subjectId ? (
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
          เลือกวิชาด้านบนเพื่อมอบหมายงาน
        </div>
      ) : (
      <form onSubmit={handleCreate} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink-muted">มอบหมายงานใหม่ — {targetLabel}</h2>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">ชื่องาน</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">รายละเอียด (ไม่บังคับ)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">กำหนดส่ง (ไม่บังคับ)</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-ink mb-1">คะแนนปลายทาง (ไม่บังคับ)</label>
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">ไม่เชื่อมกับเกรดบุ๊ค</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name ?? a.title} ({CATEGORY_LABEL[a.category]} · เทอม {a.term} · เต็ม {a.max_score})
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-ink mb-1">คะแนนเต็ม</label>
            <input
              type="text"
              inputMode="decimal"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-ink mb-1">ตัดทอนเหลือ</label>
            <input
              type="text"
              inputMode="decimal"
              value={reducedMaxScore}
              onChange={(e) => setReducedMaxScore(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
        </div>
        {error && <p className="text-danger-strong text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "กำลังสร้าง..." : "มอบหมายงาน"}
        </button>
      </form>
      )}

      <div className="bg-white rounded-card border-[0.5px] border-border p-5">
        <h2 className="text-sm font-semibold text-ink-muted mb-3">งานทั้งหมด</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-ink-faint">ยังไม่มีงานที่มอบหมาย</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) =>
              editingId === t.id ? (
                <form key={t.id} onSubmit={handleSaveEdit} className="bg-surface border-[0.5px] border-navy-600 rounded-control px-4 py-3 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="รายละเอียด (ไม่บังคับ)"
                    className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={editAssignmentId}
                      onChange={(e) => setEditAssignmentId(e.target.value)}
                      className="flex-1 min-w-[200px] border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    >
                      <option value="">ไม่เชื่อมกับเกรดบุ๊ค</option>
                      {assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.display_name ?? a.title} ({CATEGORY_LABEL[a.category]} · เทอม {a.term} · เต็ม {a.max_score})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editMaxScore}
                      onChange={(e) => setEditMaxScore(e.target.value)}
                      placeholder="คะแนนเต็ม"
                      className="w-28 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editReducedMaxScore}
                      onChange={(e) => setEditReducedMaxScore(e.target.value)}
                      placeholder="ตัดทอนเหลือ"
                      className="w-32 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  </div>
                  {error && <p className="text-danger-strong text-sm">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-navy-900 text-white px-3.5 py-1.5 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {savingEdit ? "..." : "บันทึก"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-ink-muted px-3 py-1.5 hover:underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              ) : (
                <div key={t.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink">{t.title}</p>
                    <p className="text-xs text-ink-faint">
                      {t.section_id ? `ห้อง ${roomNameById[t.section_id] ?? "?"}` : "ทุกห้อง"} · ส่งแล้ว {submissionCounts[t.id] ?? 0} คน
                      {t.due_date && ` · กำหนดส่ง ${new Date(t.due_date).toLocaleDateString("th-TH")}`}
                    </p>
                    {t.assignment_id && (
                      <p className="text-xs text-navy-600 mt-0.5">
                        → {assignmentLabel(t.assignment_id) ?? "ช่องคะแนน"}
                        {t.max_score != null && ` · เต็ม ${t.max_score}`}
                        {t.reduced_max_score != null && ` → ตัดทอนเหลือ ${t.reduced_max_score}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/teacher/tasks/${t.id}${sectionId ? `?section_id=${sectionId}` : ""}`}
                      className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                    >
                      ดูงานที่ส่ง
                    </Link>
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                    >
                      แก้ไข
                    </button>
                    <ConfirmButton
                      message="ลบงานนี้ใช่ไหม?"
                      detail={`"${t.title}" และงานที่นักเรียนส่งไว้ทั้งหมดจะถูกลบถาวร`}
                      onConfirm={() => handleDelete(t.id)}
                    >
                      ลบ
                    </ConfirmButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
