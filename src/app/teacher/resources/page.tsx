import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ResourceManager from "./ResourceManager";

export default async function TeacherResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  if (!subject_id) redirect("/teacher/dashboard");

  const [{ data: subject }, { data: resources }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("resources").select("*").eq("subject_id", subject_id)
      .order("term").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{subject?.name}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-5">จัดการไฟล์เอกสาร</h1>
        <ResourceManager subjectId={subject_id} resources={resources ?? []} />
      </main>
    </div>
  );
}
