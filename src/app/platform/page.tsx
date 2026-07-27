import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ReviewRequestButtons from "./ReviewRequestButtons";

function normalizeSchoolName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function PlatformPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: me } = await supabase
    .from("teachers")
    .select("id, full_name, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!me || !me.is_super_admin) redirect("/teacher/dashboard");

  const svc = serviceClient();
  const { data: requests } = await svc
    .from("school_requests")
    .select("id, requester_name, requester_email, school_name, status, created_at")
    .order("created_at", { ascending: false });
  const { data: schools } = await svc.from("schools").select("name, school_code");

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const reviewed = requests?.filter((r) => r.status !== "pending") ?? [];

  // เดารหัสโรงเรียนให้ ถ้าชื่อโรงเรียนในคำขอตรงกับที่มีอยู่แล้วเป๊ะๆ (แค่ช่วยพิมพ์ — ตอนอนุมัติระบบยึดรหัสที่กรอกจริงเป็นหลัก
  // ไม่ใช่ชื่อ เพื่อกันโรงเรียนชื่อเดียวกันแต่คนละที่ถูกรวมกันโดยไม่ตั้งใจ)
  function suggestCode(schoolName: string) {
    const target = normalizeSchoolName(schoolName);
    return (schools ?? []).find((s) => normalizeSchoolName(s.name) === target)?.school_code;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={me.full_name} role="teacher" homeHref="/platform" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-ink">คำขอเปิดใช้งานโรงเรียนใหม่</h1>
          <p className="text-sm text-ink-faint mt-0.5">Platform super-admin</p>
          <Link href="/admin" className="text-sm text-navy-600 hover:underline mt-2 inline-block">
            ไปหน้าจัดการครูทุกโรงเรียน →
          </Link>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">รอตรวจสอบ ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-ink-faint">ไม่มีคำขอค้างอยู่</p>
          ) : (
            <div className="space-y-2">
              {pending.map((r) => (
                <div key={r.id} className="bg-surface rounded-control px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-ink font-medium">{r.school_name}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{r.requester_name} · {r.requester_email}</p>
                    </div>
                    <ReviewRequestButtons requestId={r.id} suggestedCode={suggestCode(r.school_name)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {reviewed.length > 0 && (
          <div className="bg-white rounded-card border-[0.5px] border-border p-5">
            <h2 className="text-sm font-semibold text-ink-muted mb-3">ประวัติ ({reviewed.length})</h2>
            <div className="space-y-2">
              {reviewed.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink font-medium">{r.school_name}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{r.requester_name} · {r.requester_email}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === "approved" ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"
                    }`}
                  >
                    {r.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
