import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase.from("students").select("*").eq("id", user.id).single();

  const { data: enrollments } = await supabase
    .from("student_sections")
    .select(`
      section_id,
      sections (
        id,
        name,
        academic_year,
        subject_id,
        subjects ( id, name, code, type )
      )
    `)
    .eq("student_id", user.id);

  type EnrollSection = {
    id: string;
    name: string;
    academic_year: string;
    subject_id: string;
    subjects: { id: string; name: string; code: string; type: string } | null;
  };

  const validEnrollments = (enrollments ?? [])
    .map((e) => e.sections as EnrollSection | null)
    .filter((s): s is EnrollSection => !!s?.subjects);

  const subjectIds = [...new Set(validEnrollments.map((s) => s.subject_id))];
  const sectionIds = [...new Set(validEnrollments.map((s) => s.id))];

  const typeLabel: Record<string, string> = { basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก" };
  const typeColor: Record<string, string> = {
    basic: "bg-blue-100 text-blue-700",
    advanced: "bg-purple-100 text-purple-700",
    elective: "bg-green-100 text-green-700",
  };

  // เทอม 1: พ.ค.-ต.ค. / เทอม 2: พ.ย.-เม.ย.
  const currentMonth = new Date().getMonth() + 1;
  const currentTerm = currentMonth >= 5 && currentMonth <= 10 ? 1 : 2;

  if (subjectIds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav name={student?.full_name ?? user.email ?? ""} />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">วิชาที่เรียน</h2>
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
            ยังไม่มีวิชาที่เรียน กรุณาติดต่อครูผู้สอน
          </div>
        </main>
      </div>
    );
  }

  const [
    { data: submissions },
    { data: scoreCache },
    { data: attendance },
    { data: taskSubs },
    { data: assignments },
    { data: tasks },
    { data: resources },
  ] = await Promise.all([
    supabase.from("submissions").select("assignment_id, score").eq("student_id", user.id),
    supabase.from("score_cache").select("assignment_id, score").eq("student_code", student?.student_code ?? ""),
    supabase.from("attendance").select("status, section_id").eq("student_code", student?.student_code ?? "").in("section_id", sectionIds),
    supabase.from("task_submissions").select("task_id").eq("student_id", user.id),
    supabase.from("assignments").select("id, subject_id").in("subject_id", subjectIds),
    supabase.from("tasks").select("id, subject_id, section_id").in("subject_id", subjectIds),
    supabase.from("resources").select("id, subject_id, section_id").in("subject_id", subjectIds),
  ]);

  const cacheMap = new Map(scoreCache?.map((s) => [s.assignment_id, s.score]) ?? []);
  const subMap = new Map([...cacheMap, ...(submissions?.map((s) => [s.assignment_id, s.score]) ?? [])]);
  const submittedTaskIds = new Set((taskSubs ?? []).map((s) => s.task_id));

  function statsFor(subjectId: string, sectionId: string) {
    const subjAssign = (assignments ?? []).filter((a) => a.subject_id === subjectId);
    const totalScore = subjAssign.reduce((sum, a) => {
      const sc = subMap.get(a.id);
      return sc != null ? sum + sc : sum;
    }, 0);

    const att = (attendance ?? []).filter((a) => a.section_id === sectionId);
    const presentCount = att.filter((a) => a.status === "present" || a.status === "late").length;
    const absentCount = att.filter((a) => a.status === "absent").length;

    const subjTasks = (tasks ?? []).filter((t) => t.subject_id === subjectId && (t.section_id == null || t.section_id === sectionId));
    const pendingTasks = subjTasks.filter((t) => !submittedTaskIds.has(t.id)).length;

    const resourceCount = (resources ?? []).filter((r) => r.subject_id === subjectId && (r.section_id == null || r.section_id === sectionId)).length;

    return { totalScore, presentCount, absentCount, totalDays: att.length, subjTasks: subjTasks.length, pendingTasks, resourceCount };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav name={student?.full_name ?? user.email ?? ""} />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <h2 className="text-xl font-semibold text-gray-800">วิชาที่เรียน</h2>

        {validEnrollments.map((section) => {
          const subject = section.subjects!;
          const s = statsFor(subject.id, section.id);
          const cards = [
            {
              href: `/assignments?subject_id=${subject.id}`,
              title: "คะแนน", icon: "📊",
              stat: `${s.totalScore}/100`, note: "คะแนนรวมปัจจุบัน",
              color: "bg-blue-50 border-blue-200", statColor: "text-blue-700",
            },
            {
              href: `/attendance?subject_id=${subject.id}`,
              title: "เวลาเรียน", icon: "🗓️",
              stat: s.totalDays > 0 ? `มา ${s.presentCount} · ขาด ${s.absentCount}` : "—",
              note: s.totalDays > 0 ? `บันทึกแล้ว ${s.totalDays} ครั้ง` : "ยังไม่มีข้อมูล",
              color: "bg-green-50 border-green-200", statColor: "text-green-700",
            },
            {
              href: `/tasks?subject_id=${subject.id}`,
              title: "ส่งงาน", icon: "📝",
              stat: s.subjTasks === 0 ? "—" : s.pendingTasks > 0 ? `ค้าง ${s.pendingTasks} ชิ้น` : "ส่งครบแล้ว",
              note: `งานทั้งหมด ${s.subjTasks} ชิ้น`,
              color: "bg-purple-50 border-purple-200",
              statColor: s.pendingTasks > 0 ? "text-purple-700" : "text-green-700",
            },
            {
              href: `/resources?subject_id=${subject.id}`,
              title: "เอกสารประกอบการเรียน", icon: "📁",
              stat: s.resourceCount > 0 ? `${s.resourceCount} ไฟล์` : "—",
              note: s.resourceCount > 0 ? "ดาวน์โหลดได้" : "ยังไม่มีไฟล์",
              color: "bg-orange-50 border-orange-200", statColor: "text-orange-700",
            },
          ];

          return (
            <section key={section.id}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-gray-800">{subject.name}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeColor[subject.type] ?? "bg-gray-100 text-gray-600"}`}>
                  {typeLabel[subject.type] ?? subject.type}
                </span>
                <span className="text-xs text-gray-400">
                  {subject.code} · ห้อง {section.name} · {currentTerm}/{section.academic_year}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-2 hover:shadow-md transition-shadow ${card.color}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{card.icon}</span>
                      <span className="font-semibold text-gray-800 text-sm truncate">{card.title}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold leading-tight ${card.statColor}`}>{card.stat}</p>
                      <p className="text-[11px] text-gray-400">{card.note}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function Nav({ name }: { name: string }) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-800">HubMath</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{name}</span>
          <form action="/auth/signout" method="POST">
            <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
