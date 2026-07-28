"use client";

import { useEffect, useState } from "react";
import { QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

const DURATION_SECONDS = 45;

export default function QrButton({ sectionId, teacherId }: { sectionId: string; teacherId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrDataUrl) return;
    if (secondsLeft <= 0) {
      setQrDataUrl(null);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [qrDataUrl, secondsLeft]);

  async function generateQr() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const expires = new Date(Date.now() + DURATION_SECONDS * 1000);
    const today = new Date().toISOString().slice(0, 10);

    const { data, error: insertError } = await supabase
      .from("qr_sessions")
      .insert({ section_id: sectionId, date: today, expires_at: expires.toISOString(), created_by: teacherId })
      .select()
      .single();

    if (insertError || !data) {
      setError("สร้าง QR ไม่สำเร็จ");
      setLoading(false);
      return;
    }

    const url = `${window.location.origin}/checkin/${data.token}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 1 });
    setQrDataUrl(dataUrl);
    setSecondsLeft(DURATION_SECONDS);
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={generateQr}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:bg-white px-3 py-1.5 rounded-control disabled:opacity-50"
      >
        <QrCode className="w-4 h-4" />
        {loading ? "กำลังสร้าง..." : "สร้าง QR"}
      </button>
      {error && <p className="text-danger-strong text-xs mt-1">{error}</p>}

      {qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-white rounded-card p-6 text-center relative max-w-xs w-full">
            <button
              onClick={() => setQrDataUrl(null)}
              className="absolute top-3 right-3 text-ink-faint hover:text-ink"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR เช็คชื่อ" className="mx-auto rounded-control" />
            <p className="text-sm text-ink-muted mt-3 font-medium">
              เหลือเวลา {secondsLeft} วินาที
            </p>
          </div>
        </div>
      )}
    </>
  );
}
