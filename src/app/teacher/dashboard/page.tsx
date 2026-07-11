import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import QrButton from "./QrButton";

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
        {(subjects ?? []).map((subject) => (
          <div key={subject.id}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">{subject.name}</h2>
              <span className="text-xs text-gray-400">
                {subject.code} · {typeLabel[subject.type] ?? subject.type}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sectionsBySubject[subject.id] ?? []).map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
                >
                  <h3 className="font-semibold text-gray-800">ห้อง {section.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {countBySection[section.id] ?? 0} คนสมัครแล้ว
                  </p>
                  <div className="flex gap-3 mt-3">
                    <Link
                      href={`/teacher/resources?subject_id=${subject.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      จัดการไฟล์
                    </Link>
                    <Link
                      href={`/teacher/tasks?subject_id=${subject.id}`}
                      className="text-sm text-purple-600 hover:underline"
                    >
                      มอบหมายงาน
                    </Link>
                  </div>
                  <div className="mt-2">
                    <QrButton sectionId={section.id} teacherId={teacher.id} />
                  </div>
                </div>
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
