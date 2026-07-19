import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, FolderOpen, Megaphone } from "lucide-react";
import { dedupeAttendance } from "@/lib/attendance";

export const dynamic = "force-dynamic";

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
    supabase.from("attendance").select("status, section_id, date, method").eq("student_code", student?.student_code ?? "").in("section_id", sectionIds),
    supabase.from("task_submissions").select("task_id").eq("student_id", user.id),
    supabase.from("assignments").select("id, subject_id").in("subject_id", subjectIds),
    supabase.from("tasks").select("id, subject_id, section_id, due_date").in("subject_id", subjectIds),
    supabase.from("resources").select("id, subject_id, section_id").in("subject_id", subjectIds),
  ]);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .in("subject_id", subjectIds)
    .order("created_at", { ascending: false });

  const cacheMap = new Map(scoreCache?.map((s) => [s.assignment_id, s.score]) ?? []);
  const subMap = new Map([...cacheMap, ...(submissions?.map((s) => [s.assignment_id, s.score]) ?? [])]);
  const submittedTaskIds = new Set((taskSubs ?? []).map((s) => s.task_id));

  function statsFor(subjectId: string, sectionId: string) {
    const subjAssign = (assignments ?? []).filter((a) => a.subject_id === subjectId);
    const totalScore = subjAssign.reduce((sum, a) => {
      const sc = subMap.get(a.id);
      return sc != null ? sum + sc : sum;
    }, 0);

    // วันเดียวกันอาจมีทั้งแถว QR และครูกรอก → ของครูชนะ
    const att = dedupeAttendance(
      (attendance ?? []).filter((a) => a.section_id === sectionId),
      (a) => a.date
    );
    const presentCount = att.filter((a) => a.status === "present" || a.status === "late").length;
    const absentCount = att.filter((a) => a.status === "absent" || a.status === "truant").length;

    const subjTasks = (tasks ?? []).filter((t) => t.subject_id === subjectId && (t.section_id == null || t.section_id === sectionId));
    const pendingList = subjTasks.filter((t) => !submittedTaskIds.has(t.id));
    const pendingTasks = pendingList.length;

    // งานค้างที่มีกำหนดส่ง: หาอันเร่งด่วนสุด
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let overdueCount = 0;
    let nearestDueDays: number | null = null; // 0=วันนี้ 1=พรุ่งนี้ ...
    for (const t of pendingList) {
      if (!t.due_date) continue;
      const diff = new Date(t.due_date).getTime() - now;
      if (diff < 0) {
        overdueCount++;
      } else {
        const days = Math.floor(diff / dayMs);
        if (nearestDueDays == null || days < nearestDueDays) nearestDueDays = days;
      }
    }

    const resourceCount = (resources ?? []).filter((r) => r.subject_id === subjectId && (r.section_id == null || r.section_id === sectionId)).length;

    return {
      totalScore, presentCount, absentCount, totalDays: att.length,
      subjTasks: subjTasks.length, pendingTasks, overdueCount, nearestDueDays, resourceCount,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav name={student?.full_name ?? user.email ?? ""} />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <h2 className="text-xl font-semibold text-gray-800">วิชาที่เรียน</h2>

        {validEnrollments.map((section) => {
          const subject = section.subjects!;
          const s = statsFor(subject.id, section.id);
          // สีใช้สื่อสถานะเท่านั้น: แดง=มีปัญหา (ขาดเรียน/งานค้าง), เขียว=เรียบร้อย, เทา=ทั่วไป
          const cards = [
            {
              href: `/grades?subject_id=${subject.id}`,
              title: "คะแนน", icon: BarChart3,
              stat: `${s.totalScore}/100`, note: "คะแนนรวมปัจจุบัน",
              statColor: "text-gray-800",
            },
            {
              href: `/attendance?subject_id=${subject.id}`,
              title: "เวลาเรียน", icon: CalendarDays,
              stat: s.totalDays > 0 ? `มา ${s.presentCount} · ขาด ${s.absentCount}` : "—",
              note: s.totalDays > 0 ? `บันทึกแล้ว ${s.totalDays} ครั้ง` : "ยังไม่มีข้อมูล",
              statColor: s.absentCount > 0 ? "text-red-600" : s.totalDays > 0 ? "text-green-700" : "text-gray-400",
            },
            {
              href: `/tasks?subject_id=${subject.id}`,
              title: "ส่งงาน", icon: ClipboardList,
              stat:
                s.subjTasks === 0 ? "—"
                : s.overdueCount > 0 ? `เลยกำหนด ${s.overdueCount} ชิ้น!`
                : s.pendingTasks > 0 ? `ค้าง ${s.pendingTasks} ชิ้น`
                : "ส่งครบแล้ว",
              note:
                s.pendingTasks > 0 && s.nearestDueDays != null
                  ? s.nearestDueDays === 0 ? "ครบกำหนดวันนี้!"
                  : s.nearestDueDays === 1 ? "ครบกำหนดพรุ่งนี้"
                  : `ครบกำหนดในอีก ${s.nearestDueDays} วัน`
                  : `งานทั้งหมด ${s.subjTasks} ชิ้น`,
              statColor: s.subjTasks === 0 ? "text-gray-400" : s.pendingTasks > 0 ? "text-red-600" : "text-green-700",
              noteColor:
                s.pendingTasks > 0 && (s.overdueCount > 0 || (s.nearestDueDays != null && s.nearestDueDays <= 1))
                  ? "text-red-500 font-medium"
                  : "text-gray-400",
            },
            {
              href: `/resources?subject_id=${subject.id}`,
              title: "เอกสารประกอบการเรียน", icon: FolderOpen,
              stat: s.resourceCount > 0 ? `${s.resourceCount} ไฟล์` : "—",
              note: s.resourceCount > 0 ? "ดาวน์โหลดได้" : "ยังไม่มีไฟล์",
              statColor: s.resourceCount > 0 ? "text-gray-800" : "text-gray-400",
            },
          ];

          const anns = (announcements ?? [])
            .filter((a) => a.subject_id === subject.id && (a.section_id == null || a.section_id === section.id))
            .slice(0, 3);

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

              {anns.length > 0 && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  {anns.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <Megaphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.message}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(a.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.title}
                      href={card.href}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-2 hover:border-gray-300 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800 text-sm truncate">{card.title}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold leading-tight ${card.statColor}`}>{card.stat}</p>
                        <p className={`text-[11px] ${("noteColor" in card && card.noteColor) || "text-gray-400"}`}>
                          {card.note}
                        </p>
                      </div>
                    </Link>
                  );
                })}
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
          <Link href="/account" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
            {name}
          </Link>
          <form action="/auth/signout" method="POST">
            <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
