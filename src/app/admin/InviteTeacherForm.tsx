"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteTeacherForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setDone(false);

    const res = await fetch("/api/admin/invite-teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, email, school_id: schoolId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "เชิญไม่สำเร็จ");
      setSending(false);
      return;
    }

    setFullName("");
    setEmail("");
    setSending(false);
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-sm font-medium text-ink mb-1">ชื่อ-นามสกุล</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-ink mb-1">อีเมล</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {sending ? "กำลังเชิญ..." : "ส่งคำเชิญ"}
      </button>
      {error && <p className="w-full text-danger-strong text-sm">{error}</p>}
      {done && <p className="w-full text-success-strong text-sm">ส่งอีเมลเชิญแล้ว รอครูใหม่กดยืนยันในอีเมล</p>}
    </form>
  );
}
