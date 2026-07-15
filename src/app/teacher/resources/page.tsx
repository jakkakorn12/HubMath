import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import ResourceManager from "./ResourceManager";

export default async function TeacherResourcesPage({
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

  const [{ data: subject }, { data: resources }, { data: section }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("resources").select("*").eq("subject_id", subject_id)
      .order("term").order("created_at", { ascending: false }),
    section_id ? supabase.from("sections").select("name").eq("id", section_id).single() : Promise.resolve({ data: null }),
  ]);

  const roomName = (section as { name: string } | null)?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {section_id ? (
        <TeacherNav sectionId={section_id} subjectId={subject_id} subjectName={subject?.name} roomName={roomName} active="files" />
      ) : (
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <a href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</a>
          </div>
        </nav>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-1">จัดการไฟล์เอกสาร</h1>
        <p className="text-sm text-gray-400 mb-5">ไฟล์เหล่านี้ใช้ร่วมกันทุกห้องในวิชา {subject?.name}</p>
        <ResourceManager subjectId={subject_id} resources={resources ?? []} />
      </main>
    </div>
  );
}
