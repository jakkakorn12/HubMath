"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

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
  resources,
}: {
  subjectId: string;
  resources: Resource[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [term, setTerm] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
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

    const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);

    const { error: insertError } = await supabase.from("resources").insert({
      subject_id: subjectId,
      title: title.trim(),
      file_url: urlData.publicUrl,
      category: category.trim() || null,
      term,
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

  async function handleDelete(id: string) {
    if (!confirm("ลบไฟล์นี้ใช่ไหม?")) return;
    const supabase = createClient();
    await supabase.from("resources").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">อัปโหลดไฟล์ใหม่</h2>
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
        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">เทอม</label>
            <select
              value={term}
              onChange={(e) => setTerm(Number(e.target.value) as 1 | 2)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>เทอม 1</option>
              <option value={2}>เทอม 2</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="w-full text-sm"
          />
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
                    {r.category ?? "ไม่ระบุหมวดหมู่"} · เทอม {r.term}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    เปิดดู
                  </a>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
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
