"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";

type Chapter = Database["public"]["Tables"]["lesson_chapters"]["Row"];

export default function ChapterManager({
  subjectId,
  sectionId,
  targetLabel,
  chapters,
  lessonCounts,
  roomNameById,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  chapters: Chapter[];
  lessonCounts: Record<string, number>;
  roomNameById: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [orderIndex, setOrderIndex] = useState("0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOrderIndex, setEditOrderIndex] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(c: Chapter) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditOrderIndex(String(c.order_index));
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

    const { error: insertError } = await supabase.from("lesson_chapters").insert({
      subject_id: subjectId,
      section_id: sectionId,
      title: title.trim(),
      order_index: Number(orderIndex) || 0,
    });

    if (insertError) {
      setError("สร้างบทไม่สำเร็จ: " + insertError.message);
      setCreating(false);
      return;
    }

    setTitle("");
    setOrderIndex("0");
    setCreating(false);
    router.refresh();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("lesson_chapters")
      .update({ title: editTitle.trim(), order_index: Number(editOrderIndex) || 0 })
      .eq("id", editingId);
    setSavingEdit(false);
    if (updateError) {
      setError("แก้ไขไม่สำเร็จ: " + updateError.message);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("lesson_chapters").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {subjectId ? (
        <form onSubmit={handleCreate} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-muted">เพิ่มบทใหม่ — {targetLabel}</h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-ink mb-1">ชื่อบท</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="เช่น บทที่ 1 เลขยกกำลัง"
                className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-ink mb-1">ลำดับ</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
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
            {creating ? "กำลังสร้าง..." : "เพิ่มบท"}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
          เลือกวิชาด้านบนเพื่อเพิ่มบทเรียน
        </div>
      )}

      <div className="bg-white rounded-card border-[0.5px] border-border p-5">
        <h2 className="text-sm font-semibold text-ink-muted mb-3">บททั้งหมด</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-ink-faint">ยังไม่มีบทเรียน</p>
        ) : (
          <div className="space-y-2">
            {chapters.map((c) =>
              editingId === c.id ? (
                <form key={c.id} onSubmit={handleSaveEdit} className="bg-surface border-[0.5px] border-navy-600 rounded-control px-4 py-3 space-y-2">
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="flex-1 min-w-[200px] border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                    <input
                      type="number"
                      value={editOrderIndex}
                      onChange={(e) => setEditOrderIndex(e.target.value)}
                      className="w-24 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
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
                <div key={c.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink">{c.title}</p>
                    <p className="text-xs text-ink-faint">
                      {c.section_id ? `ห้อง ${roomNameById[c.section_id] ?? "?"}` : "ทุกห้อง"} · {lessonCounts[c.id] ?? 0} บทเรียนย่อย
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/teacher/lessons/${c.id}${sectionId ? `?section_id=${sectionId}` : ""}`}
                      className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                    >
                      จัดการบทเรียนย่อย
                    </Link>
                    <button
                      onClick={() => startEdit(c)}
                      className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                    >
                      แก้ไข
                    </button>
                    <ConfirmButton
                      message="ลบบทนี้ใช่ไหม?"
                      detail={`"${c.title}" และบทเรียนย่อยทั้งหมดในบทนี้จะถูกลบถาวร`}
                      onConfirm={() => handleDelete(c.id)}
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
