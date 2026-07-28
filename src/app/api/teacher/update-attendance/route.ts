import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["present", "late", "absent", "leave", "truant"];

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type AttendanceRow = { student_code: string; status: string | null };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { section_id?: string; date?: string; rows?: AttendanceRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const sectionId = (body.section_id ?? "").trim();
  const date = (body.date ?? "").trim();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!sectionId || !date) return NextResponse.json({ error: "missing section_id or date" }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });

  for (const r of rows) {
    if (r.status !== null && !VALID_STATUSES.includes(r.status ?? "")) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const svc = serviceClient();

  // เช็คว่าห้องนี้เป็นของวิชาที่ครูคนนี้สอนจริง
  const { data: section } = await svc.from("sections").select("subject_id").eq("id", sectionId).maybeSingle();
  if (!section) return NextResponse.json({ error: "ไม่พบห้องเรียนนี้" }, { status: 404 });

  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", section.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  const toUpsert = rows
    .filter((r) => r.status !== null)
    .map((r) => ({
      student_code: r.student_code,
      section_id: sectionId,
      date,
      status: r.status,
      method: "teacher" as const,
    }));
  const toDelete = rows.filter((r) => r.status === null);

  if (toUpsert.length > 0) {
    const { error } = await svc
      .from("attendance")
      .upsert(toUpsert, { onConflict: "student_code,section_id,date,method" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const r of toDelete) {
    await svc
      .from("attendance")
      .delete()
      .eq("student_code", r.student_code)
      .eq("section_id", sectionId)
      .eq("date", date)
      .eq("method", "teacher");
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
