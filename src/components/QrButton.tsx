"use client";

import { useEffect, useState } from "react";
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
    <div>
      {!qrDataUrl ? (
        <button
          onClick={generateQr}
          disabled={loading}
          className="text-sm text-green-600 hover:underline disabled:opacity-50"
        >
          {loading ? "กำลังสร้าง..." : "สร้าง QR เช็คชื่อ"}
        </button>
      ) : (
        <div className="mt-3 p-4 bg-gray-50 rounded-xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR เช็คชื่อ" className="mx-auto rounded-lg" />
          <p className="text-sm text-gray-500 mt-2 font-medium">
            เหลือเวลา {secondsLeft} วินาที
          </p>
          <button
            onClick={() => setQrDataUrl(null)}
            className="text-xs text-gray-500 hover:underline mt-1"
          >
            ปิด
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
