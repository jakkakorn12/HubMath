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

type RosterRow = { student_number: number; student_code: string; full_name: string };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id, school_id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!teacher.school_id) return NextResponse.json({ error: "บัญชีนี้ยังไม่ได้ผูกกับโรงเรียน" }, { status: 400 });

  let body: { section_id?: string; class_level?: string; rows?: RosterRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const sectionId = (body.section_id ?? "").trim();
  const classLevel = (body.class_level ?? "").trim();
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!sectionId || !classLevel) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const svc = serviceClient();

  // เช็คว่าห้องนี้เป็นของวิชาที่ครูคนนี้สอนจริง
  const { data: section } = await svc.from("sections").select("subject_id").eq("id", sectionId).single();
  if (!section) return NextResponse.json({ error: "ไม่พบห้องเรียนนี้" }, { status: 404 });

  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", section.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  const { error: rosterError } = await svc.from("student_roster").upsert(
    rows.map((r) => ({ student_code: r.student_code, full_name: r.full_name, class_level: classLevel, school_id: teacher.school_id })),
    { onConflict: "school_id,student_code" }
  );
  if (rosterError) return NextResponse.json({ error: rosterError.message }, { status: 500 });

  const { error: enrollError } = await svc.from("roster_enrollments").upsert(
    rows.map((r) => ({ student_code: r.student_code, section_id: sectionId, student_number: r.student_number, school_id: teacher.school_id })),
    { onConflict: "school_id,student_code,section_id" }
  );
  if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
