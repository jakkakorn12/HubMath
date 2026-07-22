import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import NewSubjectForm from "./NewSubjectForm";

export const dynamic = "force-dynamic";

export default async function NewSubjectPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />

      <main className="max-w-lg mx-auto px-4 py-8">
        <a href="/teacher/dashboard" className="text-navy-600 hover:underline text-sm">← หน้าหลัก</a>
        <h1 className="text-xl font-semibold text-ink mt-3 mb-6">สร้างวิชาใหม่</h1>
        <NewSubjectForm />
      </main>
    </div>
  );
}
