"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuspendToggleButton({
  teacherId,
  isSuspended,
}: {
  teacherId: string;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setWorking(true);
    setError(null);

    const res = await fetch("/api/admin/toggle-teacher-suspension", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_id: teacherId, suspended: !isSuspended }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "ดำเนินการไม่สำเร็จ");
      setWorking(false);
      setConfirming(false);
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  const label = isSuspended ? "เปิดใช้งาน" : "ระงับการใช้งาน";

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={working}
            className="text-xs font-medium px-3 py-1.5 rounded-control bg-navy-900 text-white hover:opacity-90 disabled:opacity-50"
          >
            {working ? "กำลังดำเนินการ..." : `ยืนยัน${label}`}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={working}
            className="text-xs font-medium px-3 py-1.5 rounded-control border-[0.5px] border-border text-ink hover:bg-surface disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
        {error && <p className="text-danger-strong text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={() => setConfirming(true)}
        className={`text-xs font-medium px-3 py-1.5 rounded-control border-[0.5px] ${
          isSuspended
            ? "border-navy-600 text-navy-600 hover:bg-navy-100"
            : "border-danger-strong text-danger-strong hover:bg-danger-soft"
        }`}
      >
        {label}
      </button>
      {error && <p className="text-danger-strong text-xs">{error}</p>}
    </div>
  );
}
