import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("teachers")
    .select("id, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_super_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { request_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const requestId = body.request_id ?? "";
  const action = body.action;
  if (!requestId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const svc = serviceClient();

  const { data: schoolReq } = await svc
    .from("school_requests")
    .select("id, requester_name, requester_email, school_name, status")
    .eq("id", requestId)
    .single();
  if (!schoolReq) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });
  if (schoolReq.status !== "pending") {
    return NextResponse.json({ error: "คำขอนี้ถูกตรวจสอบไปแล้ว" }, { status: 400 });
  }

  if (action === "reject") {
    const { error } = await svc
      .from("school_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === "approve": สร้างโรงเรียนใหม่ แล้วเชิญผู้ขอเป็นแอดมินของโรงเรียนนั้น
  const { data: school, error: schoolError } = await svc
    .from("schools")
    .insert({ name: schoolReq.school_name })
    .select("id")
    .single();
  if (schoolError || !school) {
    return NextResponse.json({ error: schoolError?.message ?? "สร้างโรงเรียนไม่สำเร็จ" }, { status: 500 });
  }

  const { data: invited, error: inviteError } = await svc.auth.admin.inviteUserByEmail(schoolReq.requester_email, {
    redirectTo: `${req.nextUrl.origin}/reset-password`,
  });
  if (inviteError || !invited.user) {
    await svc.from("schools").delete().eq("id", school.id);
    return NextResponse.json({ error: inviteError?.message ?? "เชิญไม่สำเร็จ" }, { status: 400 });
  }

  const { error: teacherError } = await svc.from("teachers").insert({
    id: invited.user.id,
    full_name: schoolReq.requester_name,
    email: schoolReq.requester_email,
    school_id: school.id,
    is_admin: true,
  });
  if (teacherError) {
    await svc.auth.admin.deleteUser(invited.user.id);
    await svc.from("schools").delete().eq("id", school.id);
    return NextResponse.json({ error: teacherError.message }, { status: 500 });
  }

  const { error: updateError } = await svc
    .from("school_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
