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

function slugifyFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "file"}${ext}`;
}

export async function POST(req: NextRequest) {
  if (!BILLING_ENABLED) return NextResponse.json({ error: "not available" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id, school_id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!teacher.school_id) return NextResponse.json({ error: "ไม่พบโรงเรียนของคุณ" }, { status: 400 });

  const form = await req.formData();
  const paymentRef = (form.get("payment_ref") as string | null)?.trim() || null;
  const file = form.get("slip") as File | null;

  if (!paymentRef && !file) {
    return NextResponse.json({ error: "กรุณาแนบสลิปหรือระบุเลขอ้างอิงการโอนอย่างน้อยหนึ่งอย่าง" }, { status: 400 });
  }

  const svc = serviceClient();

  let slipUrl: string | null = null;
  if (file) {
    const path = `billing-slips/${teacher.school_id}/${Date.now()}-${slugifyFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await svc.storage
      .from("submissions")
      .upload(path, buffer, { contentType: file.type || undefined });
    if (uploadError) return NextResponse.json({ error: "อัปโหลดสลิปไม่สำเร็จ: " + uploadError.message }, { status: 500 });
    slipUrl = path;
  }

  const { error: insertError } = await svc.from("billing_payments").insert({
    school_id: teacher.school_id,
    submitted_by: teacher.id,
    payment_ref: paymentRef,
    slip_url: slipUrl,
    status: "pending",
    resulting_paid_until: null,
    reviewed_at: null,
    reviewed_by: null,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
