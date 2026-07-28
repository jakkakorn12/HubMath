"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";
import FileInput from "@/components/FileInput";

type Media = Database["public"]["Tables"]["learning_media"]["Row"];

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

export default function MediaManager({
  subjectId,
  sectionId,
  targetLabel,
  media,
  roomNameById,
  typeLabelBySubject,
  signedUrls,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  media: Media[];
  roomNameById: Record<string, string>;
  typeLabelBySubject: Record<string, string>;
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mediaType, setMediaType] = useState<"link" | "file">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setError("กรุณาเลือกวิชาก่อน");
      return;
    }
    if (!title.trim()) return;
    if (mediaType === "link" && !url.trim()) {
      setError("กรุณาใส่ลิงก์");
      return;
    }
    if (mediaType === "file" && !file) {
      setError("กรุณาเลือกไฟล์");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (mediaType === "file" && file) {
      const path = `${subjectId}/media-${Date.now()}-${slugifyFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("resources").upload(path, file);
      if (uploadError) {
        setError("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
        setSaving(false);
        return;
      }
      fileUrl = path;
      fileName = file.name;
    }

    const { error: insertError } = await supabase.from("learning_media").insert({
      subject_id: subjectId,
      section_id: sectionId,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      media_type: mediaType,
      url: mediaType === "link" ? url.trim() : null,
      file_url: fileUrl,
      file_name: fileName,
    });

    if (insertError) {
      setError("บันทึกข้อมูลไม่สำเร็จ: " + insertError.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setUrl("");
    setFile(null);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(m: Media) {
    const supabase = createClient();
    await supabase.from("learning_media").delete().eq("id", m.id);
    if (m.media_type === "file" && m.file_url) {
      await supabase.storage.from("resources").remove([m.file_url]);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {subjectId ? (
        <form onSubmit={handleCreate} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-muted">เพิ่มสื่อการเรียนรู้ — {targetLabel}</h2>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">ชื่อ (ที่นักเรียนเห็น)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">คำอธิบาย (ไม่บังคับ)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">หมวดหมู่ (ไม่บังคับ)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="เช่น คลิปสอนย้อนหลัง"
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMediaType("link")}
              className={`px-3 py-1 rounded-full ${mediaType === "link" ? "bg-navy-900 text-white" : "bg-surface text-ink-muted"}`}
            >
              ลิงก์
            </button>
            <button
              type="button"
              onClick={() => setMediaType("file")}
              className={`px-3 py-1 rounded-full ${mediaType === "file" ? "bg-navy-900 text-white" : "bg-surface text-ink-muted"}`}
            >
              อัปโหลดไฟล์
            </button>
          </div>
          {mediaType === "link" ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="เช่น https://youtube.com/..."
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          ) : (
            <FileInput file={file} onChange={setFile} />
          )}
          {error && <p className="text-danger-strong text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "เพิ่มสื่อการเรียนรู้"}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
          เลือกวิชาด้านบนเพื่อเพิ่มสื่อการเรียนรู้
        </div>
      )}

      <div className="bg-white rounded-card border-[0.5px] border-border p-5">
        <h2 className="text-sm font-semibold text-ink-muted mb-3">สื่อการเรียนรู้ทั้งหมด</h2>
        {media.length === 0 ? (
          <p className="text-sm text-ink-faint">ยังไม่มีสื่อการเรียนรู้</p>
        ) : (
          <div className="space-y-2">
            {media.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                <div>
                  <p className="text-sm text-ink">{m.title}</p>
                  <p className="text-xs text-ink-faint">
                    {[
                      m.category ?? "ไม่ระบุหมวดหมู่",
                      m.media_type === "link" ? "ลิงก์" : "ไฟล์",
                      typeLabelBySubject[m.subject_id],
                      m.section_id ? `ห้อง ${roomNameById[m.section_id] ?? "?"}` : "ทุกห้อง",
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={m.media_type === "link" ? m.url ?? "#" : signedUrls[m.id] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-ink border-[0.5px] border-border rounded-control px-2.5 py-1.5 hover:bg-surface transition-colors"
                  >
                    เปิดดู
                  </a>
                  <ConfirmButton
                    message="ลบสื่อการเรียนรู้นี้ใช่ไหม?"
                    detail={`"${m.title}" จะถูกลบถาวร นักเรียนจะไม่เห็นอีก`}
                    onConfirm={() => handleDelete(m)}
                  >
                    ลบ
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
