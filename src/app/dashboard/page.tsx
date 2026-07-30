import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CalendarDays, ClipboardList, FolderOpen, Megaphone } from "lucide-react";
import { dedupeAttendance } from "@/lib/attendance";
import Header from "@/components/Header";

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
    .filter((s): s is EnrollSection => !!s?.subjects)
    // เรียงตามรหัสวิชาให้เหมือนกันทุกคน (query ไม่การันตีลำดับ)
    .sort((a, b) => (a.subjects!.code).localeCompare(b.subjects!.code, "th", { numeric: true }));

  const subjectIds = [...new Set(validEnrollments.map((s) => s.subject_id))];
  const sectionIds = [...new Set(validEnrollments.map((s) => s.id))];

  const typeLabel: Record<string, string> = { basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก" };

  // เทอม 1: พ.ค.-ต.ค. / เทอม 2: พ.ย.-เม.ย.
  const currentMonth = new Date().getMonth() + 1;
  const currentTerm = currentMonth >= 5 && currentMonth <= 10 ? 1 : 2;

  if (subjectIds.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold text-ink mb-6">วิชาที่เรียน</h2>
          <div className="bg-white border-[0.5px] border-border rounded-card p-8 text-center text-ink-muted">
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
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-ink mb-6">วิชาที่เรียน</h2>

        <div className="divide-y-[0.5px] divide-border">
          {validEnrollments.map((section) => {
            const subject = section.subjects!;
            const s = statsFor(subject.id, section.id);
            const pct = Math.min(s.totalScore, 100);

            // สีใช้สื่อสถานะเท่านั้น: ส้ม/แดง=งานค้าง/เลยกำหนด ที่เหลือเป็นสีตัวอักษรปกติ
            const stats = [
              {
                href: `/attendance?subject_id=${subject.id}`,
                icon: CalendarDays,
                label: "เวลาเรียน",
                value: s.totalDays > 0 ? `มา ${s.presentCount}/${s.totalDays}` : "—",
                note: s.totalDays > 0 ? (s.absentCount > 0 ? `ขาด ${s.absentCount} ครั้ง` : "ไม่มีขาด") : "ยังไม่มีข้อมูล",
                valueColor: "text-ink",
              },
              {
                href: `/tasks?subject_id=${subject.id}`,
                icon: ClipboardList,
                label: "งานที่ต้องส่ง",
                value:
                  s.subjTasks === 0 ? "—"
                  : s.overdueCount > 0 ? `เลยกำหนด ${s.overdueCount} ชิ้น`
                  : s.pendingTasks > 0 ? `ค้าง ${s.pendingTasks} ชิ้น`
                  : "ส่งครบแล้ว",
                note:
                  s.pendingTasks > 0 && s.nearestDueDays != null
                    ? s.nearestDueDays === 0 ? "ครบกำหนดวันนี้"
                    : s.nearestDueDays === 1 ? "ครบกำหนดพรุ่งนี้"
                    : `ครบกำหนดในอีก ${s.nearestDueDays} วัน`
                    : s.subjTasks > 0 ? `งานทั้งหมด ${s.subjTasks} ชิ้น` : "",
                valueColor:
                  s.subjTasks === 0 ? "text-ink-faint"
                  : s.overdueCount > 0 ? "text-danger-strong"
                  : s.pendingTasks > 0 ? "text-warning-strong"
                  : "text-ink",
              },
              {
                href: `/resources?subject_id=${subject.id}`,
                icon: FolderOpen,
                label: "เอกสาร",
                value: s.resourceCount > 0 ? `${s.resourceCount} ไฟล์` : "—",
                note: s.resourceCount > 0 ? "ดาวน์โหลดได้" : "ยังไม่มีไฟล์",
                valueColor: "text-ink",
              },
            ];

            const anns = (announcements ?? [])
              .filter((a) => a.subject_id === subject.id && (a.section_id == null || a.section_id === section.id))
              .slice(0, 3);

            return (
              <section key={section.id} className="py-8 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-4">
                  <h3 className="text-xl font-semibold text-ink">{subject.name}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-navy-100 text-navy-900">
                    {typeLabel[subject.type] ?? subject.type}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {subject.code} · ห้อง {section.name} · {currentTerm}/{section.academic_year}
                  </span>
                </div>

                {anns.length > 0 && (
                  <div className="mb-4 rounded-control bg-warning-soft px-4 py-3 space-y-2">
                    {anns.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Megaphone className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <p className="text-sm text-ink whitespace-pre-wrap">{a.message}</p>
                        </div>
                        <p className="text-[11px] text-ink-faint shrink-0">
                          {new Date(a.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  href={`/grades?subject_id=${subject.id}`}
                  className="block -mx-3 px-3 py-2 rounded-card hover:bg-white transition-colors mb-3"
                >
                  <p className="text-xs text-ink-faint mb-1">คะแนนสะสม</p>
                  <div className="flex items-end gap-2">
                    <span className="text-[44px] leading-none font-bold text-navy-900">{s.totalScore}</span>
                    <span className="text-base text-ink-faint mb-0.5">/100</span>
                    <span className="ml-auto mb-1 text-xs font-medium px-2 py-1 rounded-full bg-success-soft text-success-strong">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-[5px] bg-navy-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-navy-900 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </Link>

                <div className="grid grid-cols-3 divide-x-[0.5px] divide-border border-t-[0.5px] border-border pt-3">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Link
                        key={stat.label}
                        href={stat.href}
                        className="px-3 first:pl-0 last:pr-0 hover:bg-white transition-colors rounded-control"
                      >
                        <div className="flex items-center gap-1.5 text-ink-faint text-xs mb-1">
                          <Icon className="w-3.5 h-3.5" />
                          {stat.label}
                        </div>
                        <p className={`text-sm font-semibold ${stat.valueColor}`}>{stat.value}</p>
                        {stat.note && <p className="text-[11px] text-ink-faint mt-0.5">{stat.note}</p>}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
