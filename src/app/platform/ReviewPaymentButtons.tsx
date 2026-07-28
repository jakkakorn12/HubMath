"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPaymentButtons({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    setWorking(true);
    setError(null);

    const res = await fetch("/api/platform/review-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId, action }),
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
