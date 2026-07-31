import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: student } = await supabase.from("students").select("id").eq("id", user.id).single();
  if (!student) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const quizSetId = String(body.quiz_set_id ?? "");
  const answers = body.answers as Record<string, string> | undefined;
  if (!quizSetId || !answers) return NextResponse.json({ error: "missing data" }, { status: 400 });

  const svc = serviceClient();

  const { data: set } = await svc.from("quiz_sets").select("*").eq("id", quizSetId).maybeSingle();
  if (!set || !set.is_published) return NextResponse.json({ error: "ไม่พบแบบทดสอบนี้" }, { status: 404 });

  // เช็คว่านักเรียนลงทะเบียนวิชานี้จริง และถ้าชุดนี้ผูกกับห้องเฉพาะ ต้องอยู่ห้องนั้น
  const { data: enrollment } = await svc
    .from("student_sections")
    .select("sections!inner(id, subject_id)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", set.subject_id)
    .limit(1)
    .maybeSingle();
  const mySectionId = (enrollment?.sections as { id: string } | null)?.id ?? null;
  if (!mySectionId) return NextResponse.json({ error: "คุณไม่ได้ลงทะเบียนวิชานี้" }, { status: 403 });
  if (set.section_id != null && set.section_id !== mySectionId) {
    return NextResponse.json({ error: "แบบทดสอบนี้ไม่ได้เปิดสำหรับห้องของคุณ" }, { status: 403 });
  }

  const { data: existing } = await svc
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_set_id", quizSetId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "คุณทำแบบทดสอบชุดนี้ไปแล้ว" }, { status: 409 });

  const { data: questions } = await svc
    .from("quiz_questions")
    .select("id, question_type, correct_answer, accepted_answers")
    .eq("quiz_set_id", quizSetId);

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: "แบบทดสอบนี้ยังไม่มีคำถาม" }, { status: 400 });
  }

  let score = 0;
  for (const q of questions) {
    const given = answers[q.id] ?? "";
    let correct = false;
    if (q.question_type === "multiple_choice") {
      correct = given === q.correct_answer;
    } else {
      const accepted = [q.correct_answer, ...(q.accepted_answers ?? [])];
      correct = accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(given));
    }
    if (correct) score++;
  }

  const { error: insertError } = await svc.from("quiz_attempts").insert({
    quiz_set_id: quizSetId,
    student_id: user.id,
    answers,
    score,
    max_score: questions.length,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "คุณทำแบบทดสอบชุดนี้ไปแล้ว" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, score, max_score: questions.length });
}
