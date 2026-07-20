import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import StudentsTable from "./StudentsTable";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");
  if (!section_id) redirect("/teacher/dashboard");

  const { data: section } = await supabase
    .from("sections")
    .select("id, name, subject_id, subjects(name)")
    .eq("id", section_id)
    .single();
  if (!section) redirect("/teacher/dashboard");

  const subject = section.subjects as { name: string } | null;

  const { data: rosterEnroll } = await supabase
    .from("roster_enrollments")
    .select("student_code, student_number")
    .eq("section_id", section_id);

  const codes = (rosterEnroll ?? []).map((r) => r.student_code);

  const [{ data: roster }, { data: registered }] = await Promise.all([
    codes.length ? supabase.from("student_roster").select("student_code, full_name").in("student_code", codes) : Promise.resolve({ data: [] as { student_code: string; full_name: string }[] }),
    codes.length ? supabase.from("students").select("student_code").in("student_code", codes) : Promise.resolve({ data: [] as { student_code: string }[] }),
  ]);

  const nameByCode = new Map((roster ?? []).map((r) => [r.student_code, r.full_name]));
  const registeredCodes = new Set((registered ?? []).map((s) => s.student_code));

  const rows = (rosterEnroll ?? [])
    .map((r) => ({
      code: r.student_code,
      number: r.student_number ?? 0,
      name: nameByCode.get(r.student_code) ?? "—",
      registered: registeredCodes.has(r.student_code),
    }))
    .sort((a, b) => a.number - b.number);

  const registeredCount = rows.filter((r) => r.registered).length;

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      <TeacherNav
        sectionId={section_id}
        subjectId={section.subject_id}
        subjectName={subject?.name}
        roomName={section.name}
        active="students"
      />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-ink mb-1">รายชื่อนักเรียน ({rows.length} คน)</h1>
        <p className="text-sm text-ink-faint mb-4">สมัครแล้ว {registeredCount} · ยังไม่สมัคร {rows.length - registeredCount}</p>

        <StudentsTable rows={rows} />
      </main>
    </div>
  );
}
