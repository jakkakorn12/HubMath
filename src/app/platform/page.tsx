import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ReviewRequestButtons from "./ReviewRequestButtons";
import ReviewPaymentButtons from "./ReviewPaymentButtons";
import { BILLING_ENABLED } from "@/lib/billingConfig";

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
  const { data: schools } = await svc.from("schools").select("id, name, school_code");

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const reviewed = requests?.filter((r) => r.status !== "pending") ?? [];

  let pendingPayments: {
    id: string;
    schoolName: string;
    submittedByName: string;
    paymentRef: string | null;
    slipLink: string | undefined;
    submittedAt: string;
  }[] = [];
  let payingTeachers: { id: string; fullName: string; schoolName: string; paidUntil: string | null }[] = [];
  if (BILLING_ENABLED) {
    const { data: payments } = await svc
      .from("billing_payments")
      .select("id, school_id, submitted_by, payment_ref, slip_url, submitted_at")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    const schoolNameById = new Map((schools ?? []).map((s) => [s.id, s.name]));

    const { data: teachers } = await svc
      .from("teachers")
      .select("id, full_name, school_id, paid_until, is_super_admin")
      .order("full_name");
    payingTeachers = (teachers ?? [])
      .filter((t) => !t.is_super_admin)
      .map((t) => ({
        id: t.id,
        fullName: t.full_name,
        schoolName: t.school_id ? (schoolNameById.get(t.school_id) ?? "?") : "—",
        paidUntil: t.paid_until,
      }));
    const submitterNameById = new Map(payingTeachers.map((t) => [t.id, t.fullName]));

    pendingPayments = await Promise.all(
      (payments ?? []).map(async (p) => {
        let slipLink: string | undefined;
        if (p.slip_url) {
          const { data } = await svc.storage.from("submissions").createSignedUrl(p.slip_url, 3600);
          slipLink = data?.signedUrl;
        }
        return {
          id: p.id,
          schoolName: schoolNameById.get(p.school_id) ?? "?",
          submittedByName: submitterNameById.get(p.submitted_by) ?? "?",
          paymentRef: p.payment_ref,
          slipLink,
          submittedAt: p.submitted_at,
        };
      })
    );
  }

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

        {BILLING_ENABLED && (
          <div className="bg-white rounded-card border-[0.5px] border-border p-5">
            <h2 className="text-sm font-semibold text-ink-muted mb-3">รอตรวจสอบการชำระเงิน ({pendingPayments.length})</h2>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-ink-faint">ไม่มีรายการค้างอยู่</p>
            ) : (
              <div className="space-y-2">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="bg-surface rounded-control px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-ink font-medium">{p.schoolName}</p>
                        <p className="text-xs text-ink-faint mt-0.5">
                          แจ้งโดย {p.submittedByName} · {new Date(p.submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {p.paymentRef && <p className="text-xs text-ink-muted mt-0.5">เลขอ้างอิง: {p.paymentRef}</p>}
                        {p.slipLink && (
                          <a href={p.slipLink} target="_blank" rel="noopener noreferrer" className="text-xs text-navy-600 hover:underline mt-0.5 inline-block">
                            ดูสลิปโอนเงิน →
                          </a>
                        )}
                      </div>
                      <ReviewPaymentButtons paymentId={p.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {BILLING_ENABLED && (
          <div className="bg-white rounded-card border-[0.5px] border-border p-5">
            <h2 className="text-sm font-semibold text-ink-muted mb-3">สถานะการชำระเงินตามครู (รายบุคคล)</h2>
            <div className="space-y-2">
              {payingTeachers.map((t) => {
                const paidUntil = t.paidUntil ? new Date(t.paidUntil) : null;
                const isActive = paidUntil != null && paidUntil > new Date();
                return (
                  <div key={t.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                    <p className="text-sm text-ink">{t.fullName} <span className="text-ink-faint">({t.schoolName})</span></p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isActive ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}>
                      {isActive
                        ? `ถึง ${paidUntil!.toLocaleDateString("th-TH", { dateStyle: "medium" })}`
                        : paidUntil
                          ? "หมดอายุแล้ว"
                          : "ยังไม่เคยชำระ"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
