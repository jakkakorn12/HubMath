import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// schools ไม่มี RLS policy ให้อ่านเลย (ล็อกไว้ทั้งหมด) — endpoint นี้เปิดเผยแค่ id+name
// ของโรงเรียนที่ตรงกับรหัสที่กรอก ใช้ตอนนักเรียนสมัครสมาชิกก่อนมีบัญชี
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const svc = serviceClient();
  const { data } = await svc.from("schools").select("id, name").eq("school_code", code).maybeSingle();
  if (!data) return NextResponse.json({ error: "ไม่พบรหัสโรงเรียนนี้" }, { status: 404 });

  return NextResponse.json({ school_id: data.id, school_name: data.name });
}
