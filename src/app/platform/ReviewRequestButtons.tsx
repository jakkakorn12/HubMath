"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewRequestButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [schoolCode, setSchoolCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    if (action === "approve" && !schoolCode.trim()) {
      setError("กรุณากรอกรหัสโรงเรียนก่อนอนุมัติ");
      return;
    }
    setWorking(true);
    setError(null);

    const res = await fetch("/api/platform/review-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, action, school_code: schoolCode.trim().toUpperCase() }),
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
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <input
        type="text"
        value={schoolCode}
        onChange={(e) => setSchoolCode(e.target.value)}
        placeholder="รหัสโรงเรียน เช่น DEBSIRIN"
        className="border-[0.5px] border-border rounded-control px-2 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-navy-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() => review("approve")}
          disabled={working}
          className="bg-navy-900 text-white px-3 py-1.5 rounded-control text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          อนุมัติ
        </button>
        <button
          onClick={() => review("reject")}
          disabled={working}
          className="bg-white border-[0.5px] border-border text-ink px-3 py-1.5 rounded-control text-xs font-medium hover:bg-surface disabled:opacity-50"
        >
          ปฏิเสธ
        </button>
      </div>
      {error && <p className="text-danger-strong text-xs">{error}</p>}
    </div>
  );
}
