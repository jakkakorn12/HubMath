import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: enrollments } = await supabase
    .from("student_sections")
    .select(`
      section_id,
      sections (
        id,
        name,
        academic_year,
        subjects (
          id,
          name,
          code,
          type
        )
      )
    `)
    .eq("student_id", user.id);

  const typeLabel: Record<string, string> = {
    basic: "พื้นฐาน",
    advanced: "เพิ่มเติม",
    elective: "เลือก",
  };

  const typeColor: Record<string, string> = {
    basic: "bg-blue-100 text-blue-700",
    advanced: "bg-purple-100 text-purple-700",
    elective: "bg-green-100 text-green-700",
  };

  // เทอม 1: พ.ค.-ต.ค. / เทอม 2: พ.ย.-เม.ย.
  const currentMonth = new Date().getMonth() + 1;
  const currentTerm = currentMonth >= 5 && currentMonth <= 10 ? 1 : 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">HubMath</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{student?.full_name ?? user.email}</span>
            <form action="/auth/signout" method="POST">
              <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">วิชาที่เรียน</h2>

        {!enrollments || enrollments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
            ยังไม่มีวิชาที่เรียน กรุณาติดต่อครูผู้สอน
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e) => {
              const section = e.sections as {
                id: string;
                name: string;
                academic_year: string;
                subjects: { id: string; name: string; code: string; type: string } | null;
              } | null;
              if (!section?.subjects) return null;
              const subject = section.subjects;
              return (
                <Link
                  key={e.section_id}
                  href={`/assignments?subject_id=${subject.id}`}
                  className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${typeColor[subject.type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {typeLabel[subject.type] ?? subject.type}
                    </span>
                    <span className="text-xs text-gray-400">{currentTerm}/{section.academic_year}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{subject.code}</p>
                  <p className="text-sm text-gray-400 mt-1">ห้อง {section.name}</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
