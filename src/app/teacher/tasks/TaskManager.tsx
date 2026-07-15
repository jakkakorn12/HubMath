"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

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
    if (!confirm("ลบงานนี้ใช่ไหม? (งานที่นักเรียนส่งไว้จะหายไปด้วย)")) return;
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
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700">{t.title}</p>
                  <p className="text-xs text-gray-400">
                    {t.section_id ? `ห้อง ${roomNameById[t.section_id] ?? "?"}` : "ทุกห้อง"} · ส่งแล้ว {submissionCounts[t.id] ?? 0} คน
                    {t.due_date && ` · กำหนดส่ง ${new Date(t.due_date).toLocaleDateString("th-TH")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/teacher/tasks/${t.id}`} className="text-xs text-blue-600 hover:underline">
                    ดูงานที่ส่ง
                  </Link>
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:underline">
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
