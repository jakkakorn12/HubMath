import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";
import { QUIZ_TOPIC_LABEL, QUIZ_TOPIC_SUBTITLE, groupByTopic } from "@/lib/quizTopics";

export const dynamic = "force-dynamic";

export default async function QuizListPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string }>;
}) {
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

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู (กันแก้ subject_id ใน URL)
  if (!mySectionId) redirect("/dashboard");

  const [{ data: student }, { data: subject }, { data: sets }, { data: attempts }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("quiz_sets").select("*").eq("subject_id", subject_id).order("order_index"),
    supabase.from("quiz_attempts").select("quiz_set_id, score, max_score").eq("student_id", user.id),
  ]);

  const visibleSets = (sets ?? []).filter((s) => s.section_id == null || s.section_id === mySectionId);
  const attemptedSetIds = new Set((attempts ?? []).map((a) => a.quiz_set_id));

  const byTopic = groupByTopic(visibleSets);

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="quiz" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">แบบทดสอบ</h1>

        {byTopic.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีแบบทดสอบในวิชานี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {byTopic.map(([topicSlug, topicSets]) => {
              const done = topicSets.filter((s) => attemptedSetIds.has(s.id)).length;
              return (
                <Link
                  key={topicSlug}
                  href={`/quiz/topic/${topicSlug}?subject_id=${subject_id}`}
                  className="bg-white shadow-sm hover:shadow-md rounded-card border-[0.5px] border-border p-5 transition-shadow block"
                >
                  <h2 className="font-bold text-ink mb-1">{QUIZ_TOPIC_LABEL[topicSlug] ?? "อื่นๆ"}</h2>
                  <p className="text-xs text-ink-faint mb-3">{QUIZ_TOPIC_SUBTITLE[topicSlug] ?? ""}</p>
                  <p className="text-xs text-navy-600 font-medium">
                    ทำแล้ว {done}/{topicSets.length} ชุด · เปิดดู →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
