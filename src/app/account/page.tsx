"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-navy-600 hover:underline text-sm">
            ← กลับ
          </button>
          <span className="text-border">|</span>
          <span className="font-semibold text-ink">บัญชีของฉัน</span>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-8 space-y-5">
        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <p className="text-sm text-ink-faint">อีเมลที่ใช้เข้าสู่ระบบ</p>
          <p className="font-semibold text-ink mt-0.5">{email ?? "กำลังโหลด..."}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink-muted">เปลี่ยนรหัสผ่าน</h2>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>
          {error && <p className="text-danger-strong text-sm">{error}</p>}
          {done && <p className="text-success-strong text-sm">เปลี่ยนรหัสผ่านสำเร็จ!</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy-900 text-white py-2 rounded-control hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {saving ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </main>
    </div>
  );
}
