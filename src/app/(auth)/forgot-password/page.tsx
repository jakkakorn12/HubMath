"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: emailData, error: rpcError } = await supabase
      .rpc("get_email_by_student_code", { p_student_code: studentCode });

    if (rpcError || !emailData) {
      setError("ไม่พบรหัสประจำตัวนี้ในระบบ");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailData, {
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
        <h1 className="text-2xl font-bold text-ink mb-2 text-center">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-ink-faint text-center mb-6">
          กรอกเลขประจำตัวนักเรียน ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณ
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-success-strong text-sm">
              ส่งอีเมลแล้ว! กรุณาตรวจสอบกล่องจดหมาย (รวมถึงถังขยะ/สแปม) แล้วกดลิงก์เพื่อตั้งรหัสผ่านใหม่
            </p>
            <Link href="/login" className="text-navy-600 hover:underline text-sm">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">เลขประจำตัวนักเรียน</label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
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
              {loading ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
            </button>
            <p className="text-center text-sm text-ink-muted">
              <Link href="/login" className="text-navy-600 hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
