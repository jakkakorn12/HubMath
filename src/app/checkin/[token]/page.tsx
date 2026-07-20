"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const resultMessage: Record<string, { text: string; ok: boolean }> = {
  success: { text: "เช็คชื่อสำเร็จ!", ok: true },
  invalid_token: { text: "QR ไม่ถูกต้อง", ok: false },
  expired: { text: "QR หมดอายุแล้ว", ok: false },
  not_student: { text: "บัญชีนี้ไม่ใช่บัญชีนักเรียน", ok: false },
  not_enrolled: { text: "คุณไม่ได้ลงทะเบียนวิชานี้", ok: false },
};

export default function CheckinPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    async function run() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=/checkin/${token}`;
        return;
      }

      const { data, error } = await supabase.rpc("check_in_via_qr", { p_token: token });
      setResult(error ? "invalid_token" : (data as string));
      setStatus("done");
    }
    run();
  }, [token]);

  const info = resultMessage[result] ?? { text: "เกิดข้อผิดพลาด", ok: false };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-card border-[0.5px] border-border p-8 w-full max-w-sm text-center">
        {status === "loading" ? (
          <p className="text-ink-muted">กำลังเช็คชื่อ...</p>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              {info.ok ? (
                <CheckCircle2 className="w-12 h-12 text-success" />
              ) : (
                <XCircle className="w-12 h-12 text-danger-strong" />
              )}
            </div>
            <p className={`text-lg font-semibold ${info.ok ? "text-success-strong" : "text-danger-strong"}`}>
              {info.text}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
