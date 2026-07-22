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

type ScoreRow = { student_code: string; assignment_id: string; score: number | null };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { subject_id?: string; rows?: ScoreRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const subjectId = (body.subject_id ?? "").trim();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!subjectId) return NextResponse.json({ error: "missing subject_id" }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const svc = serviceClient();

  // เช็คว่าครูคนนี้สอนวิชานี้จริง
  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  // เช็คว่า assignment_id ทุกตัวที่ส่งมาเป็นของวิชานี้จริง กันแอบยิง assignment_id วิชาอื่นมาปน
  const assignmentIds = [...new Set(rows.map((r) => r.assignment_id))];
  const { data: validAssignments } = await svc
    .from("assignments")
    .select("id")
    .eq("subject_id", subjectId)
    .in("id", assignmentIds);
  const validIds = new Set((validAssignments ?? []).map((a) => a.id));
  if (assignmentIds.some((id) => !validIds.has(id))) {
    return NextResponse.json({ error: "พบ assignment ที่ไม่ตรงกับวิชานี้" }, { status: 403 });
  }

  const toUpsert = rows
    .filter((r) => r.score !== null)
    .map((r) => ({ student_code: r.student_code, assignment_id: r.assignment_id, score: r.score }));
  const toDelete = rows.filter((r) => r.score === null);

  if (toUpsert.length > 0) {
    const { error } = await svc
      .from("score_cache")
      .upsert(toUpsert, { onConflict: "student_code,assignment_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const r of toDelete) {
    await svc
      .from("score_cache")
      .delete()
      .eq("student_code", r.student_code)
      .eq("assignment_id", r.assignment_id);
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
