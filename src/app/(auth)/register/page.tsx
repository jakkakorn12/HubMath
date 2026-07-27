"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [schoolCode, setSchoolCode] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schoolCode.trim()) {
      setError("กรุณากรอกรหัสโรงเรียน");
      return;
    }
    if (!studentCode.trim()) {
      setError("กรุณากรอกเลขประจำตัว");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    const resolveRes = await fetch(`/api/public/resolve-school?code=${encodeURIComponent(schoolCode.trim())}`);
    const resolveData = await resolveRes.json();
    if (!resolveRes.ok) {
      setError(resolveData.error ?? "ไม่พบรหัสโรงเรียนนี้");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { student_code: studentCode, school_id: resolveData.school_id },
      },
    });

    if (signUpError) {
      const msgMap: Record<string, string> = {
        "User already registered": "อีเมลนี้ถูกใช้งานแล้ว",
        "Password should be at least 6 characters": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      };
      setError(msgMap[signUpError.message] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-2 text-center">สมัครสมาชิก</h1>
        <p className="text-sm text-ink-faint text-center mb-6">ใช้เลขประจำตัวนักเรียนของคุณ</p>
        <form onSubmit={handleRegister} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">รหัสโรงเรียน</label>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="เช่น DEBSIRIN"
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">เลขประจำตัว</label>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          {error && <p className="text-danger-strong text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-900 text-white py-2 rounded-control hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>
        <p className="text-center text-sm text-ink-muted mt-4">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-navy-600 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
