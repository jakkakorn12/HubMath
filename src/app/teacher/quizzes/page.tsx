import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import QuizSetManager from "./QuizSetManager";

export const dynamic = "force-dynamic";

export default async function TeacherQuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("code"),
    supabase.from("sections").select("id, name, subject_id").order("name"),
  ]);

  const roomNameById: Record<string, string> = {};
  for (const s of sections ?? []) roomNameById[s.id] = s.name;

  let query = supabase.from("quiz_sets").select("*").order("order_index");
  if (subject_id) {
    query = query.eq("subject_id", subject_id);
    if (section_id) query = query.or(`section_id.is.null,section_id.eq.${section_id}`);
  }
  const { data: sets } = await query;

  const setIds = (sets ?? []).map((s) => s.id);
  const [{ data: questionCounts }, { data: attempts }] = await Promise.all([
    setIds.length
      ? supabase.from("quiz_questions").select("quiz_set_id").in("quiz_set_id", setIds)
      : Promise.resolve({ data: [] as { quiz_set_id: string }[] }),
    setIds.length
      ? supabase.from("quiz_attempts").select("quiz_set_id, score, max_score").in("quiz_set_id", setIds)
      : Promise.resolve({ data: [] as { quiz_set_id: string; score: number; max_score: number }[] }),
  ]);

  const questionCountBySet: Record<string, number> = {};
  for (const q of questionCounts ?? []) questionCountBySet[q.quiz_set_id] = (questionCountBySet[q.quiz_set_id] ?? 0) + 1;

  const grouped: Record<string, { score: number; max: number }[]> = {};
  for (const a of attempts ?? []) {
    (grouped[a.quiz_set_id] ??= []).push({ score: a.score, max: a.max_score });
  }
  const attemptStatsBySet: Record<string, { count: number; avgPercent: number }> = {};
  for (const [setId, rows] of Object.entries(grouped)) {
    const avgPercent = (rows.reduce((sum, r) => sum + (r.max > 0 ? r.score / r.max : 0), 0) / rows.length) * 100;
    attemptStatsBySet[setId] = { count: rows.length, avgPercent };
  }

  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = section_id ? roomNameById[section_id] : undefined;
  const targetLabel = !subject_id ? "" : section_id ? `ห้อง ${roomName}` : `ทุกห้องในวิชา ${subjectName}`;
  const inRoomShell = !!(section_id && subject_id);

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      {inRoomShell ? (
        <TeacherNav
          sectionId={section_id!}
          subjectId={subject_id!}
          subjectName={subjectName}
          roomName={roomName}
          active="quiz"
        />
      ) : (
        <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="quiz" />
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!inRoomShell && (
          <SubjectRoomPicker
            subjects={subjects ?? []}
            sections={sections ?? []}
            subjectId={subject_id}
            sectionId={section_id}
          />
        )}
        <QuizSetManager
          subjectId={subject_id ?? null}
          sectionId={section_id ?? null}
          targetLabel={targetLabel}
          sets={sets ?? []}
          questionCountBySet={questionCountBySet}
          attemptStatsBySet={attemptStatsBySet}
          roomNameById={roomNameById}
        />
      </main>
    </div>
  );
}
