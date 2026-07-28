import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import QrButton from "@/components/QrButton";
import AttendanceEditor from "./AttendanceEditor";
import AttendanceReport, { type AttendanceReportRow } from "./AttendanceReport";
import { dedupeAttendance } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const ATTENDANCE_PASS_THRESHOLD = 80;

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "มา", late: "สาย", absent: "ขาด", leave: "ลา", truant: "หนีเรียน",
};
const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success-strong",
  late: "bg-warning-soft text-warning-strong",
  absent: "bg-danger-soft text-danger-strong",
  leave: "bg-navy-100 text-navy-900",
  truant: "bg-danger-soft text-danger-strong",
};
const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "absent", "leave", "truant"];

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string; mode?: string; date?: string }>;
}) {
  const { subject_id, section_id, mode, date: dateParam } = await searchParams;
  const editMode = mode === "edit";
  const reportMode = mode === "report";
  const today = new Date().toISOString().slice(0, 10);
  const date = dateParam || today;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("code"),
    supabase.from("sections").select("id, name, subject_id").order("name"),
  ]);

  const inRoomShell = !!(section_id && subject_id);
  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = (sections ?? []).find((s) => s.id === section_id)?.name;

  // ── ข้อมูลห้องที่เลือก ──
  type Row = {
    code: string;
    number: number;
    name: string;
    today: AttendanceStatus | null;
    totals: Record<AttendanceStatus, number>;
  };
  let rows: Row[] = [];
  let todayCounts: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, leave: 0, truant: 0 };
  let notCheckedToday = 0;
  let recordedDays = 0;
  let editorStudents: { code: string; number: number; name: string }[] = [];
  let editorInitialStatuses: Record<string, AttendanceStatus | null> = {};
  let reportDates: string[] = [];
  let reportRows: AttendanceReportRow[] = [];

  if (section_id) {
    const [{ data: rosterEnroll }, { data: attRaw }] = await Promise.all([
      supabase.from("roster_enrollments").select("student_code, student_number").eq("section_id", section_id),
      supabase.from("attendance").select("student_code, date, status, method").eq("section_id", section_id),
    ]);

    const codes = (rosterEnroll ?? []).map((r) => r.student_code);
    const { data: rosterNames } = codes.length
      ? await supabase.from("student_roster").select("student_code, full_name").in("student_code", codes)
      : { data: [] as { student_code: string; full_name: string }[] };
    const nameByCode = new Map((rosterNames ?? []).map((r) => [r.student_code, r.full_name]));

    editorStudents = (rosterEnroll ?? [])
      .map((r) => ({ code: r.student_code, number: r.student_number ?? 0, name: nameByCode.get(r.student_code) ?? "—" }))
      .sort((a, b) => a.number - b.number);

    // นักเรียน+วันเดียวกันอาจมีทั้งแถว QR และครูกรอก → ของครูชนะ
    const att = dedupeAttendance(attRaw ?? [], (a) => `${a.student_code}__${a.date}`);
    recordedDays = new Set(att.map((a) => a.date)).size;

    // สำหรับหน้าแก้ไข: สถานะจริงของวันที่เลือก (หลัง dedupe แล้ว) — ใช้เป็นค่าตั้งต้นในตัวแก้ไข
    for (const a of att) {
      if (a.date === date) editorInitialStatuses[a.student_code] = a.status as AttendanceStatus;
    }

    const todayByCode = new Map<string, AttendanceStatus>();
    const totalsByCode = new Map<string, Record<AttendanceStatus, number>>();
    for (const a of att) {
      const status = a.status as AttendanceStatus;
      if (a.date === today) todayByCode.set(a.student_code, status);
      if (!totalsByCode.has(a.student_code)) {
        totalsByCode.set(a.student_code, { present: 0, late: 0, absent: 0, leave: 0, truant: 0 });
      }
      totalsByCode.get(a.student_code)![status]++;
    }

    rows = (rosterEnroll ?? [])
      .map((r) => ({
        code: r.student_code,
        number: r.student_number ?? 0,
        name: nameByCode.get(r.student_code) ?? "—",
        today: todayByCode.get(r.student_code) ?? null,
        totals: totalsByCode.get(r.student_code) ?? { present: 0, late: 0, absent: 0, leave: 0, truant: 0 },
      }))
      .sort((a, b) => a.number - b.number);

    for (const r of rows) {
      if (r.today) todayCounts[r.today]++;
      else notCheckedToday++;
    }

    // รายงานทั้งเทอม: หนึ่งคอลัมน์ต่อวันที่มีการเช็คชื่อจริง + ร้อยละ + สิทธิ์การเข้าสอบ
    reportDates = [...new Set(att.map((a) => a.date))].sort();
    const statusByCodeDate = new Map(att.map((a) => [`${a.student_code}__${a.date}`, a.status as AttendanceStatus]));

    reportRows = editorStudents.map((s) => {
      const byDate: Record<string, AttendanceStatus | null> = {};
      let attended = 0; // มา + สาย
      let countable = 0; // วันเรียนทั้งหมด - วันลา - วันที่ไม่มีข้อมูลของคนนี้
      for (const d of reportDates) {
        const status = statusByCodeDate.get(`${s.code}__${d}`) ?? null;
        byDate[d] = status;
        if (!status || status === "leave") continue;
        countable++;
        if (status === "present" || status === "late") attended++;
      }
      const percentage = countable > 0 ? Math.round((attended / countable) * 100) : null;
      return {
        code: s.code,
        number: s.number,
        name: s.name,
        byDate,
        percentage,
        eligible: percentage == null ? null : percentage >= ATTENDANCE_PASS_THRESHOLD,
      };
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      {inRoomShell ? (
        <TeacherNav
          sectionId={section_id!}
          subjectId={subject_id!}
          subjectName={subjectName}
          roomName={roomName}
          active="attendance"
        />
      ) : (
        <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="attendance" />
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!inRoomShell && (
          <SubjectRoomPicker
            subjects={subjects ?? []}
            sections={sections ?? []}
            subjectId={subject_id}
            sectionId={section_id}
            showAllSubjects={false}
            requireRoom
          />
        )}

        {!section_id ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            เลือกวิชาและห้องด้านบนเพื่อเช็คชื่อ
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-1 text-sm">
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}`}
                  className={`px-3 py-1.5 rounded-control font-medium ${!editMode && !reportMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-surface"}`}
                >
                  ดูสรุป
                </Link>
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}&mode=edit&date=${date}`}
                  className={`px-3 py-1.5 rounded-control font-medium ${editMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-surface"}`}
                >
                  เช็คชื่อ
                </Link>
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}&mode=report`}
                  className={`px-3 py-1.5 rounded-control font-medium ${reportMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-surface"}`}
                >
                  รายงานทั้งเทอม
                </Link>
                {!editMode && !reportMode && (
                  <div className="px-3 py-1.5">
                    <QrButton sectionId={section_id} teacherId={teacher.id} />
                  </div>
                )}
              </div>
              {editMode && (
                <form method="GET" className="flex items-center gap-2">
                  <input type="hidden" name="subject_id" value={subject_id} />
                  <input type="hidden" name="section_id" value={section_id} />
                  <input type="hidden" name="mode" value="edit" />
                  <label className="text-sm text-ink-faint">วันที่</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={date}
                    max={today}
                    className="border-[0.5px] border-border rounded-control px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  <button
                    type="submit"
                    className="text-sm font-medium text-navy-600 hover:underline"
                  >
                    ไป
                  </button>
                </form>
              )}
            </div>

            {editMode ? (
              <AttendanceEditor
                sectionId={section_id}
                date={date}
                students={editorStudents}
                initialStatuses={editorInitialStatuses}
              />
            ) : reportMode ? (
              <AttendanceReport
                dates={reportDates}
                rows={reportRows}
                fileName={`เช็คชื่อ-${subjectName ?? "วิชา"}-ห้อง${roomName ?? ""}`}
              />
            ) : (
              <>
            {/* สรุปวันนี้ */}
            <div className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h2 className="text-sm font-semibold text-ink-muted mb-3">
                วันนี้ ({new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long" })})
              </h2>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <span key={s} className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_CHIP[s]}`}>
                    {STATUS_LABEL[s]} {todayCounts[s]}
                  </span>
                ))}
                <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-surface text-ink-muted">
                  ยังไม่เช็ค {notCheckedToday}
                </span>
              </div>
            </div>

            {/* ตารางรายบุคคล */}
            <div>
              <h2 className="text-sm font-semibold text-ink-muted mb-2">
                สรุปรายบุคคล <span className="font-normal text-ink-faint">(บันทึกแล้ว {recordedDays} วัน)</span>
              </h2>
              <div className="bg-white rounded-card border-[0.5px] border-border overflow-auto max-h-[70vh]">
                <table className="w-full text-sm text-center border-separate border-spacing-0 min-w-[640px]">
                  <thead>
                    <tr className="text-ink-muted">
                      <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 w-12">เลขที่</th>
                      <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-3 py-2 text-left">ชื่อ</th>
                      <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 font-semibold">วันนี้</th>
                      {STATUS_ORDER.map((s) => (
                        <th key={s} className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 font-medium whitespace-nowrap">
                          {STATUS_LABEL[s]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code}>
                        <td className="border-b-[0.5px] border-border px-2 py-2 text-ink-muted">{r.number || "—"}</td>
                        <td className="border-b-[0.5px] border-border px-3 py-2 text-left text-ink">{r.name}</td>
                        <td className="border-b-[0.5px] border-border px-2 py-2 bg-surface/50">
                          {r.today ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CHIP[r.today]}`}>
                              {STATUS_LABEL[r.today]}
                            </span>
                          ) : (
                            <span className="text-border">—</span>
                          )}
                        </td>
                        {STATUS_ORDER.map((s) => (
                          <td
                            key={s}
                            className={`border-b-[0.5px] border-border px-2 py-2 ${
                              r.totals[s] > 0
                                ? s === "absent" || s === "truant"
                                  ? "text-danger-strong font-semibold"
                                  : "text-ink"
                                : "text-border"
                            }`}
                          >
                            {r.totals[s] > 0 ? r.totals[s] : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-ink-faint">ยังไม่มีนักเรียนในห้องนี้</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-ink-faint">
              กรอกเช็คชื่อได้ทั้งที่หน้า "เช็คชื่อ" ด้านบน หรือผ่าน Google Sheets เหมือนเดิม — ลบตัวอักษรในชีทเพื่อลบบันทึกของวันนั้น
            </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
