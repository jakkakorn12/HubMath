"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "@/components/ConfirmButton";
import type { Database } from "@/lib/supabase/types";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

export default function AnnouncementManager({
  subjectId,
  sectionId,
  targetLabel,
  announcements,
  roomNameById,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  announcements: Announcement[];
  roomNameById: Record<string, string>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editMessage.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    await supabase.from("announcements").update({ message: editMessage.trim() }).eq("id", editingId);
    setSavingEdit(false);
    setEditingId(null);
    router.refresh();
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setError("กรุณาเลือกวิชาก่อน");
      return;
    }
    if (!message.trim()) return;
    setPosting(true);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("announcements").insert({
      subject_id: subjectId,
      section_id: sectionId,
      message: message.trim(),
    });

    if (insertError) {
      setError("โพสต์ไม่สำเร็จ: " + insertError.message);
      setPosting(false);
      return;
    }

    setMessage("");
    setPosting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("announcements").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!subjectId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm text-gray-400">
          เลือกวิชาด้านบนเพื่อโพสต์ประกาศ
        </div>
      ) : (
        <form onSubmit={handlePost} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">โพสต์ประกาศใหม่ — {targetLabel}</h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            required
            placeholder="เช่น พรุ่งนี้สอบย่อย เรื่อง เลขยกกำลัง เตรียมเครื่องคิดเลขมาด้วย"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={posting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {posting ? "กำลังโพสต์..." : "โพสต์ประกาศ"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ประกาศทั้งหมด</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีประกาศ</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) =>
              editingId === a.id ? (
                <form key={a.id} onSubmit={handleSaveEdit} className="bg-gray-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2">
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={3}
                    required
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
                <div key={a.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.section_id ? `ห้อง ${roomNameById[a.section_id] ?? "?"}` : "ทุกห้อง"} ·{" "}
                      {new Date(a.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => { setEditingId(a.id); setEditMessage(a.message); }}
                      className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <ConfirmButton
                      message="ลบประกาศนี้ใช่ไหม?"
                      onConfirm={() => handleDelete(a.id)}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline"
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
