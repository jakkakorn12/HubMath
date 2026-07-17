"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileInput from "@/components/FileInput";

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

async function sha256Hex(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function SubmitForm({
  taskId,
  studentId,
  existingContent,
  existingFileName,
}: {
  taskId: string;
  studentId: string;
  existingContent: string | null;
  existingFileName: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "file">(existingFileName ? "file" : "text");
  const [content, setContent] = useState(existingContent ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDone(false);
    const supabase = createClient();

    let file_url: string | null = null;
    let file_name: string | null = null;
    let content_hash: string | null = null;
    let contentValue: string | null = null;

    if (mode === "file") {
      if (!file) {
        setError("กรุณาเลือกไฟล์");
        setSubmitting(false);
        return;
      }
      const buffer = await file.arrayBuffer();
      content_hash = await sha256Hex(buffer);
      const path = `${studentId}/${taskId}/${slugifyFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setError("อัปโหลดไม่สำเร็จ: " + uploadError.message);
        setSubmitting(false);
        return;
      }
      file_url = path;
      file_name = file.name;
    } else {
      if (!content.trim()) {
        setError("กรุณากรอกคำตอบ");
        setSubmitting(false);
        return;
      }
      contentValue = content.trim();
      const normalized = contentValue.replace(/\s+/g, " ").trim();
      content_hash = await sha256Hex(new TextEncoder().encode(normalized));
    }

    const { error: upsertError } = await supabase.from("task_submissions").upsert(
      {
        task_id: taskId,
        student_id: studentId,
        content: contentValue,
        file_url,
        file_name,
        content_hash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "task_id,student_id" }
    );

    if (upsertError) {
      setError("บันทึกไม่สำเร็จ: " + upsertError.message);
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-3 py-1 rounded-full ${mode === "text" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          พิมพ์คำตอบ
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1 rounded-full ${mode === "file" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          แนบไฟล์
        </button>
      </div>

      {mode === "text" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="พิมพ์คำตอบที่นี่..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <FileInput file={file} onChange={setFile} />
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}
      {done && <p className="text-green-600 text-xs">ส่งงานสำเร็จ!</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "กำลังส่ง..." : existingContent || existingFileName ? "ส่งใหม่" : "ส่งงาน"}
      </button>
    </form>
  );
}
