import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { BILLING_ENABLED } from "@/lib/billingConfig";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  if (!BILLING_ENABLED) return NextResponse.json({ error: "not available" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("teachers")
    .select("id, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_super_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { payment_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const paymentId = body.payment_id ?? "";
  const action = body.action;
  if (!paymentId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const svc = serviceClient();

  const { data: payment } = await svc
    .from("billing_payments")
    .select("id, school_id, status")
    .eq("id", paymentId)
    .single();
  if (!payment) return NextResponse.json({ error: "ไม่พบรายการชำระเงิน" }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ error: "รายการนี้ถูกตรวจสอบไปแล้ว" }, { status: 400 });
  }

  if (action === "reject") {
    const { error } = await svc
      .from("billing_payments")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: me.id })
      .eq("id", paymentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === "approve": คำนวณวันหมดอายุใหม่จาก paid_until ปัจจุบันของโรงเรียน ณ ตอนอนุมัติ (ไม่ใช่ตอนส่ง)
  // กันปัญหาอนุมัติไม่เรียงลำดับ — ถ้ายังไม่หมดอายุ ต่อจากวันเดิม ถ้าหมดแล้ว/ยังไม่เคยจ่าย เริ่มนับจากวันนี้
  const { data: school } = await svc.from("schools").select("id, paid_until").eq("id", payment.school_id).single();
  if (!school) return NextResponse.json({ error: "ไม่พบโรงเรียน" }, { status: 404 });

  const today = new Date();
  const currentPaidUntil = school.paid_until ? new Date(school.paid_until) : null;
  const base = currentPaidUntil && currentPaidUntil > today ? currentPaidUntil : today;
  const newPaidUntil = toDateOnly(addYears(base, 1));

  const { error: schoolError } = await svc.from("schools").update({ paid_until: newPaidUntil }).eq("id", school.id);
  if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 });

  const { error: paymentError } = await svc
    .from("billing_payments")
    .update({
      status: "approved",
      resulting_paid_until: newPaidUntil,
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
    })
    .eq("id", paymentId);
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });

  return NextResponse.json({ ok: true, paid_until: newPaidUntil });
}
