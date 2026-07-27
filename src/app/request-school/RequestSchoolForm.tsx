"use client";

import { useState } from "react";

export default function RequestSchoolForm() {
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/public/request-school", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requester_name: requesterName,
        requester_email: requesterEmail,
        school_name: schoolName,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "ส่งคำขอไม่สำเร็จ");
      setSaving(false);
      return;
    }

    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-success-soft rounded-card p-5 text-success-strong text-sm">
        ส่งคำขอแล้ว ทีมงานจะติดต่อกลับทางอีเมลที่ให้ไว้ครับ
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">ชื่อ-นามสกุลของคุณ</label>
        <input
          type="text"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">อีเมลของคุณ</label>
        <input
          type="email"
          value={requesterEmail}
          onChange={(e) => setRequesterEmail(e.target.value)}
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">ชื่อโรงเรียน</label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>
      {error && <p className="text-danger-strong text-sm">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-navy-900 text-white py-2 rounded-control hover:opacity-90 disabled:opacity-50 font-medium"
      >
        {saving ? "กำลังส่ง..." : "ส่งคำขอ"}
      </button>
    </form>
  );
}
