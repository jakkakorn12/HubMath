import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import TaskManager from "./TaskManager";

export default async function TeacherTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  if (!subject_id) redirect("/teacher/dashboard");

  const [{ data: subject }, { data: tasks }, { data: submissions }, { data: section }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("tasks").select("*").eq("subject_id", subject_id).order("created_at", { ascending: false }),
    supabase.from("task_submissions").select("task_id"),
    section_id ? supabase.from("sections").select("name").eq("id", section_id).single() : Promise.resolve({ data: null }),
  ]);

  const submissionCounts: Record<string, number> = {};
  for (const s of submissions ?? []) {
    submissionCounts[s.task_id] = (submissionCounts[s.task_id] ?? 0) + 1;
  }

  const roomName = (section as { name: string } | null)?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {section_id ? (
        <TeacherNav sectionId={section_id} subjectId={subject_id} subjectName={subject?.name} roomName={roomName} active="tasks" />
      ) : (
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <a href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</a>
          </div>
        </nav>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-1">มอบหมายงาน</h1>
        <p className="text-sm text-gray-400 mb-5">งานเหล่านี้มอบหมายให้ทุกห้องในวิชา {subject?.name}</p>
        <TaskManager subjectId={subject_id} tasks={tasks ?? []} submissionCounts={submissionCounts} />
      </main>
    </div>
  );
}
