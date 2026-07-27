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
  // ยืนยันว่าคนเรียกเป็นแอดมินจริง ผ่าน session cookie ไม่ใช่ secret header
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("teachers")
    .select("id, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!admin?.is_super_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { full_name?: string; email?: string; school_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const fullName = (body.full_name ?? "").trim();
  const email = (body.email ?? "").trim();
  const schoolId = (body.school_id ?? "").trim();
  if (!fullName || !email || !schoolId) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและอีเมล" }, { status: 400 });
  }

  const svc = serviceClient();

  const { data: school } = await svc.from("schools").select("id").eq("id", schoolId).maybeSingle();
  if (!school) return NextResponse.json({ error: "ไม่พบโรงเรียนนี้" }, { status: 404 });

  const { data: invited, error: inviteError } = await svc.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${req.nextUrl.origin}/reset-password`,
  });
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message ?? "เชิญไม่สำเร็จ" }, { status: 400 });
  }

  const { error: insertError } = await svc.from("teachers").insert({
    id: invited.user.id,
    full_name: fullName,
    email,
    school_id: schoolId,
    is_admin: false,
  });
  if (insertError) {
    // ลบ auth user ทิ้งกันข้อมูลค้าง ถ้าสร้างแถว teachers ไม่สำเร็จ
    await svc.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
