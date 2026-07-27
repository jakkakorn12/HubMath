import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ไม่มี session เพราะคนขอยังไม่มีบัญชี — เปิดรับสาธารณะ แต่แค่ insert คำขอ
// ไม่มีสิทธิ์อะไรเพิ่มเติมจนกว่า super-admin จะอนุมัติผ่าน /platform
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  let body: { requester_name?: string; requester_email?: string; school_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const requesterName = (body.requester_name ?? "").trim();
  const requesterEmail = (body.requester_email ?? "").trim();
  const schoolName = (body.school_name ?? "").trim();

  if (!requesterName || !requesterEmail || !schoolName) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const svc = serviceClient();
  const { error } = await svc.from("school_requests").insert({
    requester_name: requesterName,
    requester_email: requesterEmail,
    school_name: schoolName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
