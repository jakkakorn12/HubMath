import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["practice", "midterm", "final", "competency"];

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

  let body: { assignment_id?: string; title?: string; category?: string; term?: number; max_score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const assignmentId = (body.assignment_id ?? "").trim();
  const title = (body.title ?? "").trim();
  const category = body.category ?? "";
  const term = Number(body.term);
  const maxScore = Number(body.max_score);

  if (!assignmentId || !title || !VALID_CATEGORIES.includes(category) || (term !== 1 && term !== 2) || !(maxScore > 0)) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบและถูกต้อง" }, { status: 400 });
  }

  const svc = serviceClient();

  // เช็คว่าช่องคะแนนนี้อยู่ในวิชาที่ครูคนนี้สอนจริง
  const { data: assignment } = await svc.from("assignments").select("subject_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "ไม่พบช่องคะแนนนี้" }, { status: 404 });

  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", assignment.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  const { error } = await svc
    .from("assignments")
    .update({ title, category, term, max_score: maxScore })
    .eq("id", assignmentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
