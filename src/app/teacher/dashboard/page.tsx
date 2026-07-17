import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }, { data: enrollments }] = await Promise.all([
    supabase.from("subjects").select("*").order("code"),
    supabase.from("sections").select("*").order("name"),
    supabase.from("student_sections").select("section_id"),
  ]);

  const countBySection: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    countBySection[e.section_id] = (countBySection[e.section_id] ?? 0) + 1;
  }

  const sectionsBySubject: Record<string, typeof sections> = {};
  for (const s of sections ?? []) {
    if (!sectionsBySubject[s.subject_id]) sectionsBySubject[s.subject_id] = [];
    sectionsBySubject[s.subject_id]!.push(s);
  }

  const typeLabel: Record<string, string> = {
    basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">HubMath — ครู</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{teacher.full_name}</span>
            <form action="/auth/signout" method="POST">
              <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/teacher/resources"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-md transition"
          >
            จัดการไฟล์
          </Link>
          <Link
            href="/teacher/tasks"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-md transition"
          >
            มอบหมายงาน
          </Link>
          <Link
            href="/teacher/attendance"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-md transition"
          >
            เช็คชื่อ
          </Link>
        </div>

        {(subjects ?? []).map((subject) => (
          <div key={subject.id}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">{subject.name}</h2>
              <span className="text-xs text-gray-400">
                {subject.code} · {typeLabel[subject.type] ?? subject.type}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sectionsBySubject[subject.id] ?? []).map((section) => (
                <Link
                  key={section.id}
                  href={`/teacher/students?section_id=${section.id}`}
                  className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow block"
                >
                  <h3 className="font-semibold text-gray-800">ห้อง {section.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {countBySection[section.id] ?? 0} คนสมัครแล้ว
                  </p>
                  <p className="text-sm text-blue-600 mt-3">เข้าจัดการห้อง →</p>
                </Link>
              ))}
              {(!sectionsBySubject[subject.id] || sectionsBySubject[subject.id]!.length === 0) && (
                <div className="text-sm text-gray-400">ยังไม่มีห้องเรียนในวิชานี้</div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
