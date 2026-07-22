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
  // ยืนยันว่าคนเรียกเป็นครูจริงผ่าน session (ไม่ใช่ secret header)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { name?: string; code?: string; type?: string; academic_year?: string; rooms?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const code = (body.code ?? "").trim();
  const type = body.type ?? "";
  const academicYear = (body.academic_year ?? "").trim();
  const roomNames = (body.rooms ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  if (!name || !code || !["basic", "advanced", "elective"].includes(type) || !academicYear) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }
  if (roomNames.length === 0) {
    return NextResponse.json({ error: "กรุณาระบุห้องเรียนอย่างน้อย 1 ห้อง" }, { status: 400 });
  }

  const svc = serviceClient();

  const { data: subject, error: subjectError } = await svc
    .from("subjects")
    .insert({ name, code, type, teacher_id: teacher.id })
    .select("id")
    .single();
  if (subjectError || !subject) {
    return NextResponse.json({ error: subjectError?.message ?? "สร้างวิชาไม่สำเร็จ" }, { status: 500 });
  }

  // กลไกจริงที่ RLS ใช้ตัดสินว่าครูสอนวิชานี้ — ต้องมีแถวนี้ ไม่งั้นครูจะมองไม่เห็นวิชาที่เพิ่งสร้างเอง
  const { error: linkError } = await svc
    .from("teacher_subjects")
    .insert({ teacher_id: teacher.id, subject_id: subject.id });
  if (linkError) {
    await svc.from("subjects").delete().eq("id", subject.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const { error: sectionsError } = await svc.from("sections").insert(
    roomNames.map((roomName) => ({
      subject_id: subject.id,
      name: roomName,
      academic_year: academicYear,
    }))
  );
  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subject_id: subject.id });
}
