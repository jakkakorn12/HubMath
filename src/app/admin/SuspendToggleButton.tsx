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
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const label = isSuspended ? "เปิดใช้งาน" : "ระงับการใช้งาน";
    if (!window.confirm(`ยืนยัน${label}บัญชีนี้?`)) return;

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
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={toggle}
        disabled={working}
        className={`text-xs font-medium px-3 py-1.5 rounded-control border-[0.5px] disabled:opacity-50 ${
          isSuspended
            ? "border-navy-600 text-navy-600 hover:bg-navy-100"
            : "border-danger-strong text-danger-strong hover:bg-danger-soft"
        }`}
      >
        {isSuspended ? "เปิดใช้งาน" : "ระงับการใช้งาน"}
      </button>
      {error && <p className="text-danger-strong text-xs">{error}</p>}
    </div>
  );
}
