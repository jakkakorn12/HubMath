import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import ChapterManager from "./ChapterManager";

export const dynamic = "force-dynamic";

export default async function TeacherLessonsPage({
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

  let query = supabase.from("lesson_chapters").select("*").order("order_index");
  if (subject_id) {
    query = query.eq("subject_id", subject_id);
    if (section_id) query = query.or(`section_id.is.null,section_id.eq.${section_id}`);
  }
  const { data: chapters } = await query;

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: lessonRows } = chapterIds.length
    ? await supabase.from("lessons").select("chapter_id").in("chapter_id", chapterIds)
    : { data: [] as { chapter_id: string }[] };
  const lessonCounts: Record<string, number> = {};
  for (const l of lessonRows ?? []) lessonCounts[l.chapter_id] = (lessonCounts[l.chapter_id] ?? 0) + 1;

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
          active="lessons"
        />
      ) : (
        <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="lessons" />
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!inRoomShell && (
          <SubjectRoomPicker
            subjects={subjects ?? []}
            sections={sections ?? []}
            subjectId={subject_id}
            sectionId={section_id}
          />
        )}
        <ChapterManager
          subjectId={subject_id ?? null}
          sectionId={section_id ?? null}
          targetLabel={targetLabel}
          chapters={chapters ?? []}
          lessonCounts={lessonCounts}
          roomNameById={roomNameById}
        />
      </main>
    </div>
  );
}
