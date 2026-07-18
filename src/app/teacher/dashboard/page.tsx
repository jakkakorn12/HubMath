import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { dedupeAttendance } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [
    { data: subjects },
    { data: sections },
    { data: enrollments },
    { data: rosterEnroll },
    { data: scoreCache },
    { data: attendance },
  ] = await Promise.all([
    supabase.from("subjects").select("*").order("code"),
    supabase.from("sections").select("*").order("name"),
    supabase.from("student_sections").select("section_id"),
    supabase.from("roster_enrollments").select("student_code, section_id"),
    supabase.from("score_cache").select("student_code, assignment_id, score"),
    supabase.from("attendance").select("section_id, status, student_code, date, method"),
  ]);

  const countBySection: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    countBySection[e.section_id] = (countBySection[e.section_id] ?? 0) + 1;
  }

  // ── สถิติภาพรวมต่อห้อง ──
  // assignment_id → subject_id (คะแนนคนห้อง 11 อยู่ 2 วิชา ต้องแยกให้ถูกวิชา)
  const { data: assignMeta } = await supabase.from("assignments").select("id, subject_id");
  const subjectByAssignment = new Map((assignMeta ?? []).map((a) => [a.id, a.subject_id]));

  // รวมคะแนนต่อ (นักเรียน, วิชา)
  const totalByStudentSubject = new Map<string, number>();
  for (const sc of scoreCache ?? []) {
    const subjId = subjectByAssignment.get(sc.assignment_id);
    if (!subjId) continue;
    const key = `${sc.student_code}__${subjId}`;
    totalByStudentSubject.set(key, (totalByStudentSubject.get(key) ?? 0) + (sc.score ?? 0));
  }

  const rosterBySection: Record<string, string[]> = {};
  for (const r of rosterEnroll ?? []) {
    (rosterBySection[r.section_id] ??= []).push(r.student_code);
  }

  const subjectBySection = new Map((sections ?? []).map((s) => [s.id, s.subject_id]));

  function sectionStats(sectionId: string) {
    const codes = rosterBySection[sectionId] ?? [];
    const subjId = subjectBySection.get(sectionId);
    const totals = codes
      .map((c) => totalByStudentSubject.get(`${c}__${subjId}`))
      .filter((t): t is number => t != null);
    const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;

    // นักเรียน+วันเดียวกันอาจมีทั้งแถว QR และครูกรอก → ของครูชนะ
    const att = dedupeAttendance(
      (attendance ?? []).filter((a) => a.section_id === sectionId),
      (a) => `${a.student_code}__${a.date}`
    );
    const present = att.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = att.length ? Math.round((present / att.length) * 100) : null;

    return { rosterCount: codes.length, avg, attendanceRate };
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
          <Link
            href="/teacher/announcements"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-md transition"
          >
            ประกาศ
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
              {(sectionsBySubject[subject.id] ?? []).map((section) => {
                const stats = sectionStats(section.id);
                return (
                  <Link
                    key={section.id}
                    href={`/teacher/gradebook?section_id=${section.id}`}
                    className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow block"
                  >
                    <h3 className="font-semibold text-gray-800">ห้อง {section.name}</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-500">
                        สมัครแล้ว{" "}
                        <span className="font-medium text-gray-700">
                          {countBySection[section.id] ?? 0}/{stats.rosterCount}
                        </span>{" "}
                        คน
                      </p>
                      <p className="text-gray-500">
                        คะแนนเฉลี่ย{" "}
                        {stats.avg != null ? (
                          <span className={`font-medium ${stats.avg >= 50 ? "text-green-700" : "text-red-600"}`}>
                            {stats.avg.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </p>
                      <p className="text-gray-500">
                        อัตรามาเรียน{" "}
                        {stats.attendanceRate != null ? (
                          <span className={`font-medium ${stats.attendanceRate >= 80 ? "text-green-700" : "text-red-600"}`}>
                            {stats.attendanceRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5">
                      เข้าจัดการห้อง
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                );
              })}
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
