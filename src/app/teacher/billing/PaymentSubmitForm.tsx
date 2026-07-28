"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileInput from "@/components/FileInput";

export default function PaymentSubmitForm() {
  const router = useRouter();
  const [paymentRef, setPaymentRef] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentRef.trim() && !slip) {
      setError("กรุณาแนบสลิปหรือระบุเลขอ้างอิงการโอนอย่างน้อยหนึ่งอย่าง");
      return;
    }
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    if (paymentRef.trim()) form.set("payment_ref", paymentRef.trim());
    if (slip) form.set("slip", slip);

    const res = await fetch("/api/teacher/submit-payment", { method: "POST", body: form });
    const data = await res.json().catch(() => ({ error: "ส่งไม่สำเร็จ" }));
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "ส่งไม่สำเร็จ");
      return;
    }

    setPaymentRef("");
    setSlip(null);
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">เลขอ้างอิงการโอน (ไม่บังคับถ้ามีสลิป)</label>
        <input
          type="text"
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
          placeholder="เช่น เลขที่รายการจากแอปธนาคาร"
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">แนบสลิปโอนเงิน (ไม่บังคับถ้ามีเลขอ้างอิง)</label>
        <FileInput file={slip} onChange={setSlip} />
      </div>
      {error && <p className="text-danger-strong text-sm">{error}</p>}
      {done && <p className="text-success-strong text-sm">ส่งข้อมูลการชำระเงินแล้ว รอแอดมินตรวจสอบ</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "กำลังส่ง..." : "แจ้งชำระเงิน"}
      </button>
    </form>
  );
}
