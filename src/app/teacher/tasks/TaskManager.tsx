"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

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
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  tasks: Task[];
  submissionCounts: Record<string, number>;
  roomNameById: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // แก้ไขงานที่มีอยู่ (ไม่ต้องลบ-สร้างใหม่ งานที่ส่งแล้วไม่หาย)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(t: Task) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    setEditDueDate(toLocalInput(t.due_date));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
      })
      .eq("id", editingId);
    setSavingEdit(false);
    if (updateError) {
      setError("แก้ไขไม่สำเร็จ: " + updateError.message);
      return;
    }
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
    setCreating(true);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("tasks").insert({
      subject_id: subjectId,
      section_id: sectionId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });

    if (insertError) {
      setError("สร้างงานไม่สำเร็จ: " + insertError.message);
      setCreating(false);
      return;
    }

    setTitle("");
    setDescription("");
    setDueDate("");
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm text-gray-400">
          เลือกวิชาด้านบนเพื่อมอบหมายงาน
        </div>
      ) : (
      <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">มอบหมายงานใหม่ — {targetLabel}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (ไม่บังคับ)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดส่ง (ไม่บังคับ)</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "กำลังสร้าง..." : "มอบหมายงาน"}
        </button>
      </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">งานทั้งหมด</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีงานที่มอบหมาย</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) =>
              editingId === t.id ? (
                <form key={t.id} onSubmit={handleSaveEdit} className="bg-gray-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="รายละเอียด (ไม่บังคับ)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingEdit ? "..." : "บันทึก"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-500 px-3 py-1.5 hover:underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              ) : (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-700">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {t.section_id ? `ห้อง ${roomNameById[t.section_id] ?? "?"}` : "ทุกห้อง"} · ส่งแล้ว {submissionCounts[t.id] ?? 0} คน
                      {t.due_date && ` · กำหนดส่ง ${new Date(t.due_date).toLocaleDateString("th-TH")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/teacher/tasks/${t.id}${sectionId ? `?section_id=${sectionId}` : ""}`}
                      className="text-xs font-medium text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      ดูงานที่ส่ง
                    </Link>
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs font-medium text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
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
