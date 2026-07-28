import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BILLING_ENABLED, SUBSCRIPTION_PRICE_PER_YEAR } from "@/lib/billingConfig";

export default async function Home() {
  if (!BILLING_ENABLED) redirect("/dashboard");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-[0.5px] border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-lg text-ink">HubMath</span>
          <Link
            href="/teacher/login"
            className="text-sm font-medium text-navy-600 hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-ink">ระบบจัดการห้องเรียนคณิตศาสตร์ ครบในที่เดียว</h1>
          <p className="text-ink-muted max-w-xl mx-auto">
            เกรดบุ๊ค เช็คชื่อ มอบหมายงาน และจัดการหลายโรงเรียน ในระบบเดียว ออกแบบมาสำหรับครูไทยโดยเฉพาะ
          </p>
          <Link
            href="/request-school"
            className="inline-block bg-navy-900 text-white px-6 py-3 rounded-control text-sm font-medium hover:opacity-90"
          >
            ขอเปิดใช้งานสำหรับโรงเรียนของคุณ
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-center">
            <p className="font-semibold text-ink mb-1">เกรดบุ๊ค</p>
            <p className="text-sm text-ink-faint">บันทึกคะแนน คำนวณเกรดอัตโนมัติ</p>
          </div>
          <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-center">
            <p className="font-semibold text-ink mb-1">เช็คชื่อ</p>
            <p className="text-sm text-ink-faint">เช็คชื่อผ่าน QR สรุปผลและสิทธิ์การเข้าสอบ</p>
          </div>
          <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-center">
            <p className="font-semibold text-ink mb-1">มอบหมายงาน</p>
            <p className="text-sm text-ink-faint">ส่งงาน ตรวจงาน เชื่อมกับเกรดบุ๊คได้ทันที</p>
          </div>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center">
          <p className="text-sm text-ink-faint mb-1">ราคา</p>
          <p className="text-3xl font-bold text-ink">{SUBSCRIPTION_PRICE_PER_YEAR} บาท</p>
          <p className="text-sm text-ink-faint">ต่อโรงเรียน ต่อปีการศึกษา</p>
        </div>
      </main>
    </div>
  );
}
