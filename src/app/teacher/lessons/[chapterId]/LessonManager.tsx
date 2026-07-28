"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";
import FileInput from "@/components/FileInput";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

function slugifyFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "file"}${ext}`;
}

type FormState = {
  title: string;
  content: string;
  mediaMode: "none" | "link" | "file";
  mediaUrl: string;
  file: File | null;
  orderIndex: string;
};

const emptyForm: FormState = { title: "", content: "", mediaMode: "none", mediaUrl: "", file: null, orderIndex: "0" };

export default function LessonManager({
  chapterId,
  subjectId,
  lessons,
  signedUrls,
}: {
  chapterId: string;
  subjectId: string;
  lessons: Lesson[];
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  function startEdit(l: Lesson) {
    setEditingId(l.id);
    setEditForm({
      title: l.title,
      content: l.content ?? "",
      mediaMode: l.media_type ?? "none",
      mediaUrl: l.media_url ?? "",
      file: null,
      orderIndex: String(l.order_index),
    });
  }

  async function uploadFile(file: File) {
    const supabase = createClient();
    const path = `${subjectId}/lesson-${Date.now()}-${slugifyFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("resources").upload(path, file);
    if (uploadError) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
    return { file_url: path, file_name: file.name };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.mediaMode === "link" && !form.mediaUrl.trim()) {
      setError("กรุณาใส่ลิงก์");
      return;
    }
    if (form.mediaMode === "file" && !form.file) {
      setError("กรุณาเลือกไฟล์");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let file_url: string | null = null;
    let file_name: string | null = null;
    if (form.mediaMode === "file" && form.file) {
      try {
        const uploaded = await uploadFile(form.file);
        file_url = uploaded.file_url;
        file_name = uploaded.file_name;
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไฟล์ไม่สำเร็จ");
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("lessons").insert({
      chapter_id: chapterId,
      subject_id: subjectId,
      title: form.title.trim(),
      content: form.content.trim() || null,
      media_type: form.mediaMode === "none" ? null : form.mediaMode,
      media_url: form.mediaMode === "link" ? form.mediaUrl.trim() : null,
      file_url,
      file_name,
      order_index: Number(form.orderIndex) || 0,
    });

    if (insertError) {
      setError("บันทึกไม่สำเร็จ: " + insertError.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setSaving(false);
    router.refresh();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm.title.trim()) return;
    if (editForm.mediaMode === "link" && !editForm.mediaUrl.trim()) {
      setError("กรุณาใส่ลิงก์");
      return;
    }
    setSavingEdit(true);
    setError(null);
    const supabase = createClient();

    let file_url: string | null = null;
    let file_name: string | null = null;
    if (editForm.mediaMode === "file") {
      if (editForm.file) {
        try {
          const uploaded = await uploadFile(editForm.file);
          file_url = uploaded.file_url;
          file_name = uploaded.file_name;
        } catch (err) {
          setError(err instanceof Error ? err.message : "อัปโหลดไฟล์ไม่สำเร็จ");
          setSavingEdit(false);
          return;
        }
      } else {
        // ไม่ได้เลือกไฟล์ใหม่ → เก็บไฟล์เดิมไว้
        const existing = lessons.find((l) => l.id === editingId);
        file_url = existing?.file_url ?? null;
        file_name = existing?.file_name ?? null;
      }
    }

    const { error: updateError } = await supabase
      .from("lessons")
      .update({
        title: editForm.title.trim(),
        content: editForm.content.trim() || null,
        media_type: editForm.mediaMode === "none" ? null : editForm.mediaMode,
        media_url: editForm.mediaMode === "link" ? editForm.mediaUrl.trim() : null,
        file_url,
        file_name,
        order_index: Number(editForm.orderIndex) || 0,
      })
      .eq("id", editingId);

    if (updateError) {
      setError("แก้ไขไม่สำเร็จ: " + updateError.message);
      setSavingEdit(false);
      return;
    }

    setEditingId(null);
    setSavingEdit(false);
    router.refresh();
  }

  async function handleDelete(l: Lesson) {
    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", l.id);
    if (l.media_type === "file" && l.file_url) {
      await supabase.storage.from("resources").remove([l.file_url]);
    }
    router.refresh();
  }

  function renderMediaModeToggle(mode: FormState["mediaMode"], onChange: (m: FormState["mediaMode"]) => void) {
    return (
      <div className="flex gap-2 text-xs">
        {(["none", "link", "file"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`px-3 py-1 rounded-full ${mode === m ? "bg-navy-900 text-white" : "bg-surface text-ink-muted"}`}
          >
            {m === "none" ? "ไม่มีสื่อแนบ" : m === "link" ? "ลิงก์" : "อัปโหลดไฟล์"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink-muted">เพิ่มบทเรียนย่อย</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-ink mb-1">ชื่อบทเรียน</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-ink mb-1">ลำดับ</label>
            <input
              type="number"
              value={form.orderIndex}
              onChange={(e) => setForm((f) => ({ ...f, orderIndex: e.target.value }))}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">เนื้อหา (ไม่บังคับ)</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={4}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        {renderMediaModeToggle(form.mediaMode, (m) => setForm((f) => ({ ...f, mediaMode: m })))}
        {form.mediaMode === "link" && (
          <input
            type="url"
            value={form.mediaUrl}
            onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
            placeholder="เช่น https://youtube.com/..."
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        )}
        {form.mediaMode === "file" && (
          <FileInput file={form.file} onChange={(f) => setForm((s) => ({ ...s, file: f }))} />
        )}
        {error && <p className="text-danger-strong text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "เพิ่มบทเรียนย่อย"}
        </button>
      </form>

      <div className="bg-white rounded-card border-[0.5px] border-border p-5">
        <h2 className="text-sm font-semibold text-ink-muted mb-3">บทเรียนย่อยทั้งหมด</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-ink-faint">ยังไม่มีบทเรียนย่อยในบทนี้</p>
        ) : (
          <div className="space-y-2">
            {lessons.map((l) =>
              editingId === l.id ? (
                <form key={l.id} onSubmit={handleSaveEdit} className="bg-surface border-[0.5px] border-navy-600 rounded-control px-4 py-3 space-y-2">
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      className="flex-1 min-w-[200px] border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                    <input
                      type="number"
                      value={editForm.orderIndex}
                      onChange={(e) => setEditForm((f) => ({ ...f, orderIndex: e.target.value }))}
                      className="w-24 border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  </div>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                    rows={4}
                    className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  {renderMediaModeToggle(editForm.mediaMode, (m) => setEditForm((f) => ({ ...f, mediaMode: m })))}
                  {editForm.mediaMode === "link" && (
                    <input
                      type="url"
                      value={editForm.mediaUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                      className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  )}
                  {editForm.mediaMode === "file" && (
                    <>
                      {l.file_name && !editForm.file && (
                        <p className="text-xs text-ink-faint">ไฟล์เดิม: {l.file_name} (เลือกไฟล์ใหม่เพื่อแทนที่)</p>
                      )}
                      <FileInput file={editForm.file} onChange={(f) => setEditForm((s) => ({ ...s, file: f }))} />
                    </>
                  )}
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
                <div key={l.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink">{l.title}</p>
                    <p className="text-xs text-ink-faint">
                      ลำดับ {l.order_index}
                      {l.media_type && ` · มี${l.media_type === "link" ? "ลิงก์" : "ไฟล์"}แนบ`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.media_type === "link" && l.media_url && (
                      <a href={l.media_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors">
                        เปิดลิงก์
                      </a>
                    )}
                    {l.media_type === "file" && signedUrls[l.id] && (
                      <a href={signedUrls[l.id]} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors">
                        เปิดไฟล์
                      </a>
                    )}
                    <button
                      onClick={() => startEdit(l)}
                      className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                    >
                      แก้ไข
                    </button>
                    <ConfirmButton
                      message="ลบบทเรียนย่อยนี้ใช่ไหม?"
                      detail={`"${l.title}" จะถูกลบถาวร`}
                      onConfirm={() => handleDelete(l)}
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
