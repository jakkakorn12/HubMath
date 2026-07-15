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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">ตั้งรหัสผ่านใหม่</h1>

        {invalid ? (
          <p className="text-red-500 text-sm text-center">
            ลิงก์นี้หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
          </p>
        ) : !ready ? (
          <p className="text-gray-400 text-sm text-center">กำลังตรวจสอบลิงก์...</p>
        ) : done ? (
          <p className="text-green-600 text-sm text-center">ตั้งรหัสผ่านใหม่สำเร็จ! กำลังพาไปหน้าหลัก...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
