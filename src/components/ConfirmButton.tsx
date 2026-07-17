"use client";

import { useState } from "react";

// ปุ่มที่เปิด dialog ยืนยันก่อนทำงานจริง — ใช้กับการลบทุกจุด
export default function ConfirmButton({
  message,
  detail,
  confirmLabel = "ลบ",
  onConfirm,
  className = "text-xs text-red-600 hover:text-red-700 hover:underline",
  children,
}: {
  message: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-gray-800">{message}</p>
            {detail && <p className="text-sm text-gray-500 mt-1">{detail}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "กำลังลบ..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
