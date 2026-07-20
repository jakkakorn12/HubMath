"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";
import FileInput from "@/components/FileInput";

type Resource = Database["public"]["Tables"]["resources"]["Row"];

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

export default function ResourceManager({
  subjectId,
  sectionId,
  targetLabel,
  resources,
  roomNameById,
  typeLabelBySubject,
  signedUrls,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  resources: Resource[];
  roomNameById: Record<string, string>;
  typeLabelBySubject: Record<string, string>;
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setError("กรุณาเลือกวิชาก่อน");
      return;
    }
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    const path = `${subjectId}/${Date.now()}-${slugifyFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("resources").upload(path, file);
    if (uploadError) {
      setError("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
      setUploading(false);
      return;
    }

    // เก็บเป็น storage path (bucket เป็น private — ต้อง sign ตอนอ่าน)
    const { error: insertError } = await supabase.from("resources").insert({
      subject_id: subjectId,
      section_id: sectionId,
      title: title.trim(),
      file_url: path,
      category: category.trim() || null,
      term: null,
    });

    if (insertError) {
      setError("บันทึกข้อมูลไม่สำเร็จ: " + insertError.message);
      setUploading(false);
      return;
    }

    setTitle("");
    setCategory("");
    setFile(null);
    setUploading(false);
    router.refresh();
  }

  async function handleDelete(id: string, path: string) {
    const supabase = createClient();
    await supabase.from("resources").delete().eq("id", id);
    // ลบไฟล์จริงใน storage ด้วย กันไฟล์ค้าง
    if (path && !path.startsWith("http")) {
      await supabase.storage.from("resources").remove([path]);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {subjectId ? (
        <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">อัปโหลดไฟล์ใหม่ — {targetLabel}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อไฟล์ (ที่นักเรียนเห็น)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ (ไม่บังคับ)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="เช่น ใบงาน"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์</label>
            <FileInput file={file} onChange={setFile} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm text-gray-400">
          เลือกวิชาด้านบนเพื่ออัปโหลดไฟล์
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ไฟล์ทั้งหมด</h2>
        {resources.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีไฟล์</p>
        ) : (
          <div className="space-y-2">
            {resources.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400">
                    {[
                      r.category ?? "ไม่ระบุหมวดหมู่",
                      typeLabelBySubject[r.subject_id],
                      r.section_id ? `ห้อง ${roomNameById[r.section_id] ?? "?"}` : "ทุกห้อง",
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {signedUrls[r.id] && (
                    <a
                      href={signedUrls[r.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      เปิดดู
                    </a>
                  )}
                  <ConfirmButton
                    message="ลบไฟล์นี้ใช่ไหม?"
                    detail={`"${r.title}" จะถูกลบถาวร นักเรียนจะไม่เห็นไฟล์นี้อีก`}
                    onConfirm={() => handleDelete(r.id, r.file_url)}
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
