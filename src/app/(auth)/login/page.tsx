"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ลิงก์รีเซ็ตรหัสผ่านบางกรณีตกลงหน้านี้พร้อม token ใน hash → ส่งต่อไปหน้าตั้งรหัสผ่าน
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      router.replace("/reset-password" + hash);
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailData,
      password,
    });

    if (signInError) {
      setError("รหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6 text-center">เข้าสู่ระบบ</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">เลขประจำตัว</label>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              required
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
        <p className="text-center text-sm text-ink-muted mt-3">
          <Link href="/forgot-password" className="text-navy-600 hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </p>
        <p className="text-center text-sm text-ink-muted mt-2">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-navy-600 hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
        <p className="text-center text-sm text-ink-muted mt-2">
          <Link href="/help" className="text-ink-faint hover:text-ink-muted hover:underline">
            วิธีใช้งาน
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
