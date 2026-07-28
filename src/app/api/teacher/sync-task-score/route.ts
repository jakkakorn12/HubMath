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

type SubRow = { id: string; student_id: string; grade: number | null };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { task_id?: string; submission_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const svc = serviceClient();

  let taskId = (body.task_id ?? "").trim();
  let subs: SubRow[] = [];

  if (body.submission_id) {
    const { data: sub } = await svc
      .from("task_submissions")
      .select("id, task_id, student_id, grade")
      .eq("id", body.submission_id)
      .maybeSingle();
    if (!sub) return NextResponse.json({ error: "ไม่พบงานที่ส่ง" }, { status: 404 });
    taskId = sub.task_id;
    subs = [{ id: sub.id, student_id: sub.student_id, grade: sub.grade }];
  }

  if (!taskId) return NextResponse.json({ error: "missing task_id or submission_id" }, { status: 400 });

  const { data: task } = await svc.from("tasks").select("id, subject_id, assignment_id").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });

  // เช็คว่าครูคนนี้สอนวิชานี้จริง
  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", task.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  if (!task.assignment_id) return NextResponse.json({ ok: true, synced: 0 });

  if (!body.submission_id) {
    // โหมด bulk: ดึงงานที่ส่งทั้งหมดของงานชิ้นนี้ (ใช้ตอนเชื่อม/เปลี่ยนช่องคะแนน เพื่อดันคะแนนที่ตรวจไว้แล้วเข้าไปด้วย)
    const { data: allSubs } = await svc.from("task_submissions").select("id, student_id, grade").eq("task_id", taskId);
    subs = allSubs ?? [];
  }

  if (subs.length === 0) return NextResponse.json({ ok: true, synced: 0 });

  const studentIds = [...new Set(subs.map((s) => s.student_id))];
  const { data: students } = await svc.from("students").select("id, student_code").in("id", studentIds);
  const codeById = new Map((students ?? []).map((s) => [s.id, s.student_code]));

  const toUpsert: { student_code: string; assignment_id: string; score: number }[] = [];
  const toDeleteCodes: string[] = [];
  for (const s of subs) {
    const code = codeById.get(s.student_id);
    if (!code) continue;
    if (s.grade == null) toDeleteCodes.push(code);
    else toUpsert.push({ student_code: code, assignment_id: task.assignment_id, score: s.grade });
  }

  if (toUpsert.length > 0) {
    const { error } = await svc.from("score_cache").upsert(toUpsert, { onConflict: "student_code,assignment_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const code of toDeleteCodes) {
    await svc.from("score_cache").delete().eq("student_code", code).eq("assignment_id", task.assignment_id);
  }

  return NextResponse.json({ ok: true, synced: toUpsert.length });
}
