import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DIFFICULTY_LABEL: Record<string, string> = { medium: "ปานกลาง", hard: "ยาก", very_hard: "ยากมาก" };
const DIFFICULTY_ORDER = ["medium", "hard", "very_hard"];

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
  const attemptBySet: Record<string, { score: number; max_score: number }> = {};
  for (const a of attempts ?? []) attemptBySet[a.quiz_set_id] = a;

  const byDifficulty: Record<string, typeof visibleSets> = {};
  for (const s of visibleSets) (byDifficulty[s.difficulty] ??= []).push(s);

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="quiz" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-lg font-bold text-ink">แบบทดสอบ</h1>

        {visibleSets.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีแบบทดสอบในวิชานี้
          </div>
        ) : (
          DIFFICULTY_ORDER.filter((d) => byDifficulty[d]?.length).map((d) => (
            <div key={d} className="space-y-3">
              <h2 className="text-sm font-semibold text-ink-muted">ระดับ{DIFFICULTY_LABEL[d]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {byDifficulty[d].map((set) => {
                  const attempt = attemptBySet[set.id];
                  return (
                    <Link
                      key={set.id}
                      href={`/quiz/${set.id}?subject_id=${subject_id}`}
                      className="bg-white shadow-sm hover:shadow-md rounded-card border-[0.5px] border-border p-5 transition-shadow block"
                    >
                      <h3 className="font-bold text-ink mb-2">{set.title}</h3>
                      <p className="text-xs text-navy-600 font-medium">
                        {attempt ? `ทำแล้ว ${attempt.score}/${attempt.max_score} · ดูผล →` : "ยังไม่ได้ทำ · เริ่มทำ →"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
