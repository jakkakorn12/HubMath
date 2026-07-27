"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TeacherForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // ใช้ได้ทั้งครูที่เคยตั้งรหัสผ่านแล้วลืม และครูที่ยังไม่เคยกดยืนยันอีเมลเชิญ (ลิงก์หมดอายุ/หาไม่เจอ)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-2 text-center">ลืมรหัสผ่าน (ครู)</h1>
        <p className="text-sm text-ink-faint text-center mb-6">
          กรอกอีเมลที่ใช้เข้าสู่ระบบ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้ — ใช้ได้ทั้งกรณีลืมรหัสผ่านและกรณีลิงก์คำเชิญเดิมหาไม่เจอหรือหมดอายุ
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-success-strong text-sm">
              ถ้าอีเมลนี้อยู่ในระบบ จะได้รับลิงก์ตั้งรหัสผ่านใหม่ กรุณาตรวจสอบกล่องจดหมาย (รวมถึงถังขยะ/สแปม)
            </p>
            <Link href="/teacher/login" className="text-navy-600 hover:underline text-sm">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            {error && <p className="text-danger-strong text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-white py-2 rounded-control hover:opacity-90 disabled:opacity-50 font-medium"
            >
              {loading ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
            </button>
            <p className="text-center text-sm text-ink-muted">
              <Link href="/teacher/login" className="text-navy-600 hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
