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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          กรอกรหัสประจำตัวนักเรียน ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณ
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 text-sm">
              ส่งอีเมลแล้ว! กรุณาตรวจสอบกล่องจดหมาย (รวมถึงถังขยะ/สแปม) แล้วกดลิงก์เพื่อตั้งรหัสผ่านใหม่
            </p>
            <Link href="/login" className="text-blue-600 hover:underline text-sm">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวนักเรียน</label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-blue-600 hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
