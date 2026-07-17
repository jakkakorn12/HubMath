import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import TaskManager from "./TaskManager";

export const dynamic = "force-dynamic";

export default async function TeacherTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("code"),
    supabase.from("sections").select("id, name, subject_id").order("name"),
  ]);

  const roomNameById: Record<string, string> = {};
  for (const s of sections ?? []) roomNameById[s.id] = s.name;

  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (subject_id) {
    query = query.eq("subject_id", subject_id);
    if (section_id) query = query.or(`section_id.is.null,section_id.eq.${section_id}`);
  }
  const { data: tasks } = await query;

  const { data: submissions } = await supabase.from("task_submissions").select("task_id");
  const submissionCounts: Record<string, number> = {};
  for (const s of submissions ?? []) submissionCounts[s.task_id] = (submissionCounts[s.task_id] ?? 0) + 1;

  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = section_id ? roomNameById[section_id] : undefined;
  const targetLabel = !subject_id ? "" : section_id ? `ห้อง ${roomName}` : `ทุกห้องในวิชา ${subjectName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="tasks" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <SubjectRoomPicker
          subjects={subjects ?? []}
          sections={sections ?? []}
          subjectId={subject_id}
          sectionId={section_id}
        />
        <TaskManager
          subjectId={subject_id ?? null}
          sectionId={section_id ?? null}
          targetLabel={targetLabel}
          tasks={tasks ?? []}
          submissionCounts={submissionCounts}
          roomNameById={roomNameById}
        />
      </main>
    </div>
  );
}
