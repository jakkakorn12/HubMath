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

  let body: { subject_id?: string; title?: string; category?: string; term?: number; max_score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const subjectId = (body.subject_id ?? "").trim();
  const title = (body.title ?? "").trim();
  const category = body.category ?? "";
  const term = Number(body.term);
  const maxScore = Number(body.max_score);

  if (!subjectId || !title || !VALID_CATEGORIES.includes(category) || (term !== 1 && term !== 2) || !(maxScore > 0)) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบและถูกต้อง" }, { status: 400 });
  }

  const svc = serviceClient();

  // เช็คว่าครูคนนี้สอนวิชานี้จริง กัน insert ข้ามวิชาคนอื่น
  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  const { error } = await svc.from("assignments").insert({
    subject_id: subjectId,
    title,
    category,
    term,
    max_score: maxScore,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
