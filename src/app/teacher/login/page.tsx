"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", signInData.user.id)
      .single();

    if (!teacher) {
      await supabase.auth.signOut();
      setError("บัญชีนี้ไม่ใช่บัญชีครู");
      setLoading(false);
      return;
    }

    router.push("/teacher/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6 text-center">เข้าสู่ระบบ (ครู)</h1>
        <form onSubmit={handleLogin} className="space-y-4">
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
        <p className="text-center text-sm text-ink-faint mt-4">
          <Link href="/teacher/forgot-password" className="text-navy-600 hover:underline">
            ลืมรหัสผ่าน / หาลิงก์คำเชิญไม่เจอ?
          </Link>
        </p>
        <p className="text-center text-sm text-ink-faint mt-2">
          <Link href="/request-school" className="text-navy-600 hover:underline">
            อยากเปิดใช้งานให้โรงเรียนอื่น?
          </Link>
        </p>
      </div>
    </div>
  );
}
