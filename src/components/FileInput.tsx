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
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="เอาไฟล์ออก"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-5 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1.5"
        >
          <Upload className="w-5 h-5 text-gray-400" />
          กดเพื่อเลือกไฟล์
        </button>
      )}
    </div>
  );
}
