"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // แบบใหม่ (ทำงานข้าม browser): ลิงก์ในอีเมลส่ง ?token_hash=... มาให้ verify ตรงนี้
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ type: "recovery", token_hash: tokenHash })
        .then(({ error }) => {
          if (error) setInvalid(true);
          else setReady(true);
        });
      return;
    }

    // token มากับ hash ของ URL (#access_token=...) → สร้าง session เองตรงๆ
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setInvalid(true);
          else setReady(true);
        });
      return;
    }

    // แบบเดิม (token มากับ hash ของ URL): รอ supabase-js ประมวลผล
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalid(true);
        return r;
      });
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6 text-center">ตั้งรหัสผ่านใหม่</h1>

        {invalid ? (
          <p className="text-danger-strong text-sm text-center">
            ลิงก์นี้หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
          </p>
        ) : !ready ? (
          <p className="text-ink-faint text-sm text-center">กำลังตรวจสอบลิงก์...</p>
        ) : done ? (
          <p className="text-success-strong text-sm text-center">ตั้งรหัสผ่านใหม่สำเร็จ! กำลังพาไปหน้าหลัก...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                minLength={6}
                className="w-full border-[0.5px] border-border rounded-control px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            {error && <p className="text-danger-strong text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-white py-2 rounded-control hover:opacity-90 disabled:opacity-50 font-medium"
            >
              {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
