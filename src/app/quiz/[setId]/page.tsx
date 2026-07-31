import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";
import TakeQuiz from "./TakeQuiz";
import { MathText } from "@/components/interactive/mathMarkup";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

export default async function QuizTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { setId } = await params;
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!subject_id) redirect("/dashboard");

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(id)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .maybeSingle();
  const mySectionId = (enrollment?.sections as { id: string } | null)?.id ?? null;

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู
  if (!mySectionId) redirect("/dashboard");

  const [{ data: student }, { data: subject }, { data: set }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("quiz_sets").select("*").eq("id", setId).maybeSingle(),
  ]);

  if (!set || set.subject_id !== subject_id) redirect(`/quiz?subject_id=${subject_id}`);
  if (set.section_id != null && set.section_id !== mySectionId) redirect(`/quiz?subject_id=${subject_id}`);

  const { data: existingAttempt } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_set_id", setId)
    .eq("student_id", user.id)
    .maybeSingle();

  const svc = serviceClient();

  if (existingAttempt) {
    const { data: questions } = await svc.from("quiz_questions").select("*").eq("quiz_set_id", setId).order("order_index");
    const answers = (existingAttempt.answers ?? {}) as Record<string, string>;

    return (
      <div className="min-h-screen bg-white">
        <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
        <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="quiz" />
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <Link href={`/quiz?subject_id=${subject_id}`} className="text-navy-600 hover:underline text-sm">
            ← กลับไปหน้าแบบทดสอบ
          </Link>
          <div className="bg-white rounded-card border-[0.5px] border-border p-6">
            <h1 className="text-lg font-bold text-ink mb-1">{set.title}</h1>
            <p className="text-sm text-ink-muted mb-5">
              ได้คะแนน{" "}
              <span className="font-bold text-navy-900">
                {existingAttempt.score}/{existingAttempt.max_score}
              </span>
            </p>
            <div className="divide-y divide-border">
              {(questions ?? []).map((q, i) => {
                const given = answers[q.id] ?? "";
                const isCorrect =
                  q.question_type === "multiple_choice"
                    ? given === q.correct_answer
                    : normalizeAnswer(given) === normalizeAnswer(q.correct_answer) ||
                      (q.accepted_answers ?? []).some((a) => normalizeAnswer(a) === normalizeAnswer(given));
                return (
                  <div key={q.id} className={i > 0 ? "pt-5 pb-5" : "pb-5"}>
                    <p className="text-sm font-semibold text-ink mb-2">
                      {i + 1}. <MathText text={q.prompt} />
                    </p>
                    {q.question_type === "multiple_choice" ? (
                      <div className="space-y-1.5 text-sm">
                        {(q.choices ?? []).map((c, ci) => {
                          const idx = String(ci);
                          const isGiven = idx === given;
                          const isRight = idx === q.correct_answer;
                          return (
                            <p
                              key={ci}
                              className={`px-3 py-1.5 rounded-control ${
                                isRight
                                  ? "bg-success-soft text-success-strong"
                                  : isGiven
                                  ? "bg-danger-soft text-danger-strong"
                                  : "text-ink-muted"
                              }`}
                            >
                              {CHOICE_LABELS[ci]}. <MathText text={c} />
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <p className={isCorrect ? "text-success-strong" : "text-danger-strong"}>
                          คำตอบของคุณ: {given || "(ไม่ได้ตอบ)"}
                        </p>
                        {!isCorrect && <p className="text-ink-muted">เฉลย: {q.correct_answer}</p>}
                      </div>
                    )}
                    {q.solution && (
                      <p className="text-xs text-ink-faint mt-2">
                        <MathText text={q.solution} />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { data: questions } = await svc
    .from("quiz_questions")
    .select("id, question_type, prompt, choices, order_index")
    .eq("quiz_set_id", setId)
    .order("order_index");

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="quiz" />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href={`/quiz?subject_id=${subject_id}`} className="text-navy-600 hover:underline text-sm">
          ← กลับไปหน้าแบบทดสอบ
        </Link>
        <TakeQuiz setId={setId} title={set.title} questions={questions ?? []} />
      </main>
    </div>
  );
}
