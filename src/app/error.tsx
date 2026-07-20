"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-3">
          <AlertTriangle className="w-10 h-10 text-danger-strong" />
        </div>
        <p className="font-semibold text-ink">เกิดข้อผิดพลาด</p>
        <p className="text-sm text-ink-muted mt-1">โหลดหน้านี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-navy-900 rounded-control hover:opacity-90"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
