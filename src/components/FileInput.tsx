"use client";

import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

// กล่องเลือกไฟล์แบบเส้นประ + แสดงชื่อไฟล์ที่เลือก (แทน input file ดีฟอลต์)
export default function FileInput({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-2 border-[0.5px] border-border rounded-control px-3 py-2.5 bg-surface">
          <FileText className="w-4 h-4 text-ink-faint shrink-0" />
          <span className="text-sm text-ink truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-ink-faint hover:text-ink-muted shrink-0"
            aria-label="เอาไฟล์ออก"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-control px-3 py-5 text-sm text-ink-muted hover:border-navy-600/40 hover:bg-surface transition-colors flex flex-col items-center gap-1.5"
        >
          <Upload className="w-5 h-5 text-ink-faint" />
          กดเพื่อเลือกไฟล์
        </button>
      )}
    </div>
  );
}
