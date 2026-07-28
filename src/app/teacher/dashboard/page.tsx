import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FolderOpen, Video, ClipboardList, CalendarCheck, Megaphone, Users, BarChart3, Plus } from "lucide-react";
import { dedupeAttendance } from "@/lib/attendance";
import Header from "@/components/Header";

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

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAtt = att.filter((a) => a.date === todayStr);
    const checkedToday = todayAtt.length > 0;
    const todayPresent = todayAtt.filter((a) => a.status === "present" || a.status === "late").length;
    const todayRate = checkedToday ? Math.round((todayPresent / todayAtt.length) * 100) : null;

    return { rosterCount: codes.length, avg, attendanceRate, checkedToday, todayRate };
  }

  const sectionsBySubject: Record<string, typeof sections> = {};
  for (const s of sections ?? []) {
    if (!sectionsBySubject[s.subject_id]) sectionsBySubject[s.subject_id] = [];
    sectionsBySubject[s.subject_id]!.push(s);
  }

  const typeLabel: Record<string, string> = {
    basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก",
  };

  // ห้องที่เรียนพร้อมกันจริง (นักเรียนมาจากคนละห้อง แต่เรียนคาบเดียวกัน) — โชว์รวมกันบน dashboard เท่านั้น
  // ข้อมูลจริง (เช็คชื่อ/คะแนน/roster) ยังแยกตาม section เดิมทุกอย่าง แค่การ์ดสรุปโชว์รวม
  const COMBINED_ROOMS: Record<string, string[][]> = {
    ค32201: [["4", "5"]],
  };

  function groupSections(subjectCode: string, list: NonNullable<typeof sections>) {
    const pairs = COMBINED_ROOMS[subjectCode] ?? [];
    const used = new Set<string>();
    const groups: { combined: boolean; items: NonNullable<typeof sections> }[] = [];
    for (const pair of pairs) {
      const matched = list.filter((s) => pair.includes(s.name));
      if (matched.length >= 2) {
        groups.push({ combined: true, items: matched });
        matched.forEach((s) => used.add(s.id));
      }
    }
    for (const s of list) {
      if (!used.has(s.id)) groups.push({ combined: false, items: [s] });
    }
    return groups;
  }

  function statsForSections(sectionIds: string[]) {
    const codes = sectionIds.flatMap((id) => rosterBySection[id] ?? []);
    const subjId = subjectBySection.get(sectionIds[0]);
    const totals = codes
      .map((c) => totalByStudentSubject.get(`${c}__${subjId}`))
      .filter((t): t is number => t != null);
    const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
    const registered = sectionIds.reduce((sum, id) => sum + (countBySection[id] ?? 0), 0);
    return { rosterCount: codes.length, avg, registered };
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />

      <div className="max-w-5xl mx-auto flex items-center gap-6 overflow-x-auto px-4 pt-4">
        {[
          { href: "/teacher/resources", label: "จัดการไฟล์", icon: FolderOpen },
          { href: "/teacher/media", label: "สื่อการเรียนรู้", icon: Video },
          { href: "/teacher/tasks", label: "มอบหมายงาน", icon: ClipboardList },
          { href: "/teacher/attendance", label: "เช็คชื่อ", icon: CalendarCheck },
          { href: "/teacher/announcements", label: "ประกาศ", icon: Megaphone },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-2 text-sm font-medium text-ink whitespace-nowrap hover:text-navy-600 transition-colors"
          >
            <s.icon className="w-4 h-4 text-navy-600" />
            {s.label}
          </Link>
        ))}
        <Link
          href="/teacher/subjects/new"
          className="flex items-center gap-2 text-sm font-medium text-navy-600 whitespace-nowrap hover:text-navy-900 transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" />
          สร้างวิชาใหม่
        </Link>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {(subjects ?? []).length === 0 && (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center">
            <p className="text-sm text-ink-muted mb-4">ยังไม่มีวิชาเป็นของคุณ เริ่มสร้างวิชาแรกได้เลย</p>
            <Link
              href="/teacher/subjects/new"
              className="inline-flex items-center gap-2 bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              สร้างวิชาใหม่
            </Link>
          </div>
        )}

        {(subjects ?? []).map((subject) => (
          <div key={subject.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-[3px] h-6 bg-navy-900 rounded-full shrink-0" />
              <h2 className="text-lg font-semibold text-ink">{subject.name}</h2>
              <span className="text-xs text-ink-faint">
                {subject.code} · {typeLabel[subject.type] ?? subject.type}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupSections(subject.code, sectionsBySubject[subject.id] ?? []).map((group) => {
                if (!group.combined) {
                  const section = group.items[0];
                  const stats = sectionStats(section.id);
                  return (
                    <Link
                      key={section.id}
                      href={`/teacher/gradebook?section_id=${section.id}`}
                      className="bg-white rounded-card p-5 border-[0.5px] border-border hover:shadow-sm hover:-translate-y-px transition-all block"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-ink">ห้อง {section.name}</h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            !stats.checkedToday
                              ? "bg-surface text-ink-faint"
                              : stats.todayRate === 100
                              ? "bg-success-soft text-success-strong"
                              : "bg-warning-soft text-warning-strong"
                          }`}
                        >
                          {!stats.checkedToday ? "ยังไม่เช็คชื่อ" : `มาเรียน ${stats.todayRate}%`}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p className="flex items-center gap-1.5 text-ink-faint">
                          <Users className="w-3.5 h-3.5" />
                          สมัครแล้ว
                          <span className="font-medium text-ink">
                            {countBySection[section.id] ?? 0}/{stats.rosterCount}
                          </span>
                          คน
                        </p>
                        <p className="flex items-center gap-1.5 text-ink-faint">
                          <BarChart3 className="w-3.5 h-3.5" />
                          คะแนนเฉลี่ย
                          <span className="font-medium text-ink">
                            {stats.avg != null ? stats.avg.toFixed(1) : "—"}
                          </span>
                        </p>
                      </div>
                    </Link>
                  );
                }

                const ids = group.items.map((s) => s.id);
                const combined = statsForSections(ids);
                return (
                  <div
                    key={ids.join("-")}
                    className="bg-white rounded-card p-5 border-[0.5px] border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-ink">
                          ห้อง {group.items.map((s) => s.name).join("-")}
                        </h3>
                        <p className="text-xs text-ink-faint mt-0.5">เรียนพร้อมกัน</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {group.items.map((s) => (
                          <Link
                            key={s.id}
                            href={`/teacher/gradebook?section_id=${s.id}`}
                            className="text-xs font-medium text-navy-600 border-[0.5px] border-navy-600/40 rounded-full px-3 py-1 hover:bg-navy-100 transition-colors"
                          >
                            ห้อง {s.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="flex items-center gap-1.5 text-ink-faint">
                        <Users className="w-3.5 h-3.5" />
                        สมัครแล้ว
                        <span className="font-medium text-ink">
                          {combined.registered}/{combined.rosterCount}
                        </span>
                        คน
                      </p>
                      <p className="flex items-center gap-1.5 text-ink-faint">
                        <BarChart3 className="w-3.5 h-3.5" />
                        คะแนนเฉลี่ย
                        <span className="font-medium text-ink">
                          {combined.avg != null ? combined.avg.toFixed(1) : "—"}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!sectionsBySubject[subject.id] || sectionsBySubject[subject.id]!.length === 0) && (
                <div className="text-sm text-ink-faint">ยังไม่มีห้องเรียนในวิชานี้</div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
