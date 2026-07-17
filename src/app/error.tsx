"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-3">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <p className="font-semibold text-gray-800">เกิดข้อผิดพลาด</p>
        <p className="text-sm text-gray-500 mt-1">โหลดหน้านี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
