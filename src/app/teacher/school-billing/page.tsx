import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { BILLING_ENABLED, SUBSCRIPTION_PRICE_PER_YEAR, PROMPTPAY_NUMBER } from "@/lib/billingConfig";
import PaymentSubmitForm from "./PaymentSubmitForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
};
const STATUS_COLOR: Record<"pending" | "approved" | "rejected", string> = {
  pending: "bg-surface text-ink-muted",
  approved: "bg-success-soft text-success-strong",
  rejected: "bg-danger-soft text-danger-strong",
};

export default async function SchoolBillingPage() {
  if (!BILLING_ENABLED) redirect("/teacher/dashboard");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("id, full_name, school_id").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");
  if (!teacher.school_id) redirect("/teacher/dashboard");

  const { data: school } = await supabase.from("schools").select("name, paid_until").eq("id", teacher.school_id).single();

  const { data: payments } = await supabase
    .from("billing_payments")
    .select("id, payment_ref, slip_url, status, submitted_at, resulting_paid_until")
    .eq("school_id", teacher.school_id)
    .order("submitted_at", { ascending: false });

  const paidUntil = school?.paid_until ? new Date(school.paid_until) : null;
  const isActive = paidUntil != null && paidUntil > new Date();

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">ค่าบริการโรงเรียน — {school?.name}</h1>
          <p
            className={`inline-block text-sm font-medium px-2.5 py-1 rounded-full mt-2 ${
              isActive ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"
            }`}
          >
            {isActive
              ? `ใช้งานได้ถึง ${paidUntil!.toLocaleDateString("th-TH", { dateStyle: "medium" })}`
              : paidUntil
                ? `หมดอายุแล้วเมื่อ ${paidUntil.toLocaleDateString("th-TH", { dateStyle: "medium" })}`
                : "ยังไม่เคยชำระเงิน"}
          </p>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-1">
          <p className="text-sm text-ink">
            ค่าบริการ <span className="font-semibold">{SUBSCRIPTION_PRICE_PER_YEAR} บาท / ปีการศึกษา</span>
          </p>
          <p className="text-sm text-ink-muted">
            โอนผ่านพร้อมเพย์เบอร์ <span className="font-medium text-ink">{PROMPTPAY_NUMBER}</span>
          </p>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">แจ้งชำระเงิน</h2>
          <PaymentSubmitForm />
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">ประวัติการแจ้งชำระเงิน</h2>
          {!payments || payments.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีประวัติการแจ้งชำระเงิน</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink">
                      {p.payment_ref ? `เลขอ้างอิง ${p.payment_ref}` : "แนบสลิปโอนเงิน"}
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      แจ้งเมื่อ {new Date(p.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                      {p.resulting_paid_until && ` · ต่ออายุถึง ${new Date(p.resulting_paid_until).toLocaleDateString("th-TH", { dateStyle: "medium" })}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
