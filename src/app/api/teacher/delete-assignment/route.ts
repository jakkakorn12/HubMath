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

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { assignment_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const assignmentId = (body.assignment_id ?? "").trim();
  if (!assignmentId) return NextResponse.json({ error: "missing assignment_id" }, { status: 400 });

  const svc = serviceClient();

  const { data: assignment } = await svc.from("assignments").select("subject_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "ไม่พบช่องคะแนนนี้" }, { status: 404 });

  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", assignment.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  // ลบคะแนนที่ผูกกับช่องนี้ก่อน กันชนกับ foreign key และกันข้อมูลค้าง
  await svc.from("score_cache").delete().eq("assignment_id", assignmentId);
  await svc.from("submissions").delete().eq("assignment_id", assignmentId);

  const { error } = await svc.from("assignments").delete().eq("id", assignmentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
