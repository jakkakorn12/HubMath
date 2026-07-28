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
import DateJumpForm from "./DateJumpForm";
import { dedupeAttendance } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const ATTENDANCE_PASS_THRESHOLD = 80;

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "มา", late: "สาย", absent: "ขาด", truant: "หนีเรียน",
  leave: "ลา", sick_leave: "ลาป่วย", personal_leave: "ลากิจ",
  field_trip: "ทัศนศึกษา", school_holiday: "หยุดพิเศษ", excused_activity: "ขอเวลาเรียน",
};
const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success-strong",
  late: "bg-warning-soft text-warning-strong",
  absent: "bg-danger-soft text-danger-strong",
  truant: "bg-danger-soft text-danger-strong",
  leave: "bg-navy-100 text-navy-900",
  sick_leave: "bg-navy-100 text-navy-900",
  personal_leave: "bg-navy-100 text-navy-900",
  field_trip: "bg-navy-100 text-navy-900",
  school_holiday: "bg-navy-100 text-navy-900",
  excused_activity: "bg-success-soft text-success-strong",
};
// ลา/ลาป่วย/ลากิจ/ทัศนศึกษา/หยุดพิเศษ — ไม่นับเป็นวันขาด (ไม่หักคะแนนร้อยละ) แต่ก็ไม่นับเป็นวันมาเรียน
const LEAVE_LIKE = new Set<AttendanceStatus>(["leave", "sick_leave", "personal_leave", "field_trip", "school_holiday"]);
// ขอเวลาเรียน (เป็นพิธีกร/ไป open house/สอบคัดค่ายฯ ที่ได้รับอนุญาตเป็นลายลักษณ์อักษร) — นับเป็นมาเรียนจริง ต่างจากลา/ทัศนศึกษาที่แค่ไม่หัก
const ATTENDED_LIKE = new Set<AttendanceStatus>(["present", "late", "excused_activity"]);
// "leave" (เดิม) เก็บไว้แสดงให้เห็นข้อมูลเก่า/จาก Sheets sync — ทัศนศึกษา/หยุดพิเศษ ตั้งผ่านปุ่มทั้งห้องเท่านั้น
const STATUS_ORDER: AttendanceStatus[] = [
  "present", "late", "excused_activity", "absent", "truant",
  "leave", "sick_leave", "personal_leave", "field_trip", "school_holiday",
];

function emptyStatusCounts(): Record<AttendanceStatus, number> {
  return {
    present: 0, late: 0, absent: 0, truant: 0, leave: 0, sick_leave: 0,
    personal_leave: 0, field_trip: 0, school_holiday: 0, excused_activity: 0,
  };
}

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
    todayNote: string | null;
    totals: Record<AttendanceStatus, number>;
    percentage: number | null;
    eligible: boolean | null;
  };
  let rows: Row[] = [];
  let todayCounts: Record<AttendanceStatus, number> = emptyStatusCounts();
  let notCheckedToday = 0;
  let recordedDays = 0;
  let editorStudents: { code: string; number: number; name: string }[] = [];
  let editorInitialStatuses: Record<string, AttendanceStatus | null> = {};
  let editorInitialNotes: Record<string, string | null> = {};
  let reportDates: string[] = [];
  let reportRows: AttendanceReportRow[] = [];

  if (section_id) {
    const [{ data: rosterEnroll }, { data: attRaw }] = await Promise.all([
      supabase.from("roster_enrollments").select("student_code, student_number").eq("section_id", section_id),
      supabase.from("attendance").select("student_code, date, status, method, note").eq("section_id", section_id),
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

    // สำหรับหน้าแก้ไข: สถานะ+หมายเหตุจริงของวันที่เลือก (หลัง dedupe แล้ว) — ใช้เป็นค่าตั้งต้นในตัวแก้ไข
    for (const a of att) {
      if (a.date === date) {
        editorInitialStatuses[a.student_code] = a.status as AttendanceStatus;
        editorInitialNotes[a.student_code] = a.note ?? null;
      }
    }

    const todayByCode = new Map<string, AttendanceStatus>();
    const todayNoteByCode = new Map<string, string | null>();
    const totalsByCode = new Map<string, Record<AttendanceStatus, number>>();
    for (const a of att) {
      const status = a.status as AttendanceStatus;
      if (a.date === date) {
        todayByCode.set(a.student_code, status);
        todayNoteByCode.set(a.student_code, a.note ?? null);
      }
      if (!totalsByCode.has(a.student_code)) {
        totalsByCode.set(a.student_code, emptyStatusCounts());
      }
      totalsByCode.get(a.student_code)![status]++;
    }

    // รายงานทั้งเทอม: หนึ่งคอลัมน์ต่อวันที่มีการเช็คชื่อจริง + ร้อยละ + สิทธิ์การเข้าสอบ
    // วันที่ไม่มีข้อมูลของนักเรียนคนนั้นเลย (ไม่ว่า QR หรือครูกรอก) นับเป็นวันขาดในการคำนวณ
    reportDates = [...new Set(att.map((a) => a.date))].sort();
    const statusByCodeDate = new Map(att.map((a) => [`${a.student_code}__${a.date}`, a.status as AttendanceStatus]));
    const noteByCodeDate = new Map(att.map((a) => [`${a.student_code}__${a.date}`, a.note ?? null]));
    const statsByCode = new Map<string, { percentage: number | null; eligible: boolean | null }>();

    reportRows = editorStudents.map((s) => {
      const byDate: Record<string, AttendanceStatus | null> = {};
      const notesByDate: Record<string, string | null> = {};
      let attended = 0; // มา + สาย + ขอเวลาเรียน
      let countable = 0; // วันเรียนทั้งหมด - วันลา/ทัศนศึกษา/หยุดพิเศษ (ไม่มีข้อมูล = นับเป็นขาด)
      for (const d of reportDates) {
        const status = statusByCodeDate.get(`${s.code}__${d}`) ?? null;
        byDate[d] = status;
        notesByDate[d] = noteByCodeDate.get(`${s.code}__${d}`) ?? null;
        if (status && LEAVE_LIKE.has(status)) continue;
        countable++;
        if (status && ATTENDED_LIKE.has(status)) attended++;
      }
      const percentage = countable > 0 ? Math.round((attended / countable) * 100) : null;
      const eligible = percentage == null ? null : percentage >= ATTENDANCE_PASS_THRESHOLD;
      statsByCode.set(s.code, { percentage, eligible });
      return { code: s.code, number: s.number, name: s.name, byDate, notesByDate, percentage, eligible };
    });

    rows = (rosterEnroll ?? [])
      .map((r) => ({
        code: r.student_code,
        number: r.student_number ?? 0,
        name: nameByCode.get(r.student_code) ?? "—",
        today: todayByCode.get(r.student_code) ?? null,
        todayNote: todayNoteByCode.get(r.student_code) ?? null,
        totals: totalsByCode.get(r.student_code) ?? emptyStatusCounts(),
        percentage: statsByCode.get(r.student_code)?.percentage ?? null,
        eligible: statsByCode.get(r.student_code)?.eligible ?? null,
      }))
      .sort((a, b) => a.number - b.number);

    for (const r of rows) {
      if (r.today) todayCounts[r.today]++;
      else notCheckedToday++;
    }
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
              <div className="inline-flex items-center gap-0.5 border-[0.5px] border-border rounded-control bg-surface p-1 text-sm">
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}&mode=edit&date=${date}`}
                  className={`px-3 py-1.5 rounded-control font-medium ${editMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-white"}`}
                >
                  เช็คชื่อ
                </Link>
                <QrButton sectionId={section_id} teacherId={teacher.id} />
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}&date=${date}`}
                  className={`px-3 py-1.5 rounded-control font-medium ${!editMode && !reportMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-white"}`}
                >
                  สรุปผล
                </Link>
                <Link
                  href={`?subject_id=${subject_id}&section_id=${section_id}&mode=report`}
                  className={`px-3 py-1.5 rounded-control font-medium ${reportMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-white"}`}
                >
                  รายงานทั้งเทอม
                </Link>
              </div>
              {!reportMode && (
                <DateJumpForm
                  subjectId={subject_id!}
                  sectionId={section_id}
                  mode={editMode ? "edit" : undefined}
                  date={date}
                  maxDate={today}
                />
              )}
            </div>

            {editMode ? (
              <AttendanceEditor
                sectionId={section_id}
                date={date}
                students={editorStudents}
                initialStatuses={editorInitialStatuses}
                initialNotes={editorInitialNotes}
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
                {date === today ? "วันนี้" : "วันที่"} ({new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long" })})
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
                      <th className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 font-semibold">
                        {date === today ? "วันนี้" : "วันที่เลือก"}
                      </th>
                      {STATUS_ORDER.map((s) => (
                        <th key={s} className="sticky top-0 z-10 bg-surface border-b-[0.5px] border-border px-2 py-2 font-medium whitespace-nowrap">
                          {STATUS_LABEL[s]}
                        </th>
                      ))}
                      <th className="sticky top-0 z-10 bg-navy-100 border-b-[0.5px] border-border px-2 py-2 font-semibold text-navy-900 whitespace-nowrap">
                        มาเรียนร้อยละ
                      </th>
                      <th className="sticky top-0 z-10 bg-navy-100 border-b-[0.5px] border-border px-2 py-2 font-semibold text-navy-900 whitespace-nowrap">
                        สิทธิ์การเข้าสอบ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code}>
                        <td className="border-b-[0.5px] border-border px-2 py-2 text-ink-muted">{r.number || "—"}</td>
                        <td className="border-b-[0.5px] border-border px-3 py-2 text-left text-ink">{r.name}</td>
                        <td className="border-b-[0.5px] border-border px-2 py-2 bg-surface/50">
                          {r.today ? (
                            <span
                              title={r.todayNote ?? undefined}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CHIP[r.today]} ${r.todayNote ? "underline decoration-dotted cursor-help" : ""}`}
                            >
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
                        <td className="border-b-[0.5px] border-border px-2 py-2 bg-navy-100 font-bold text-navy-900">
                          {r.percentage != null ? `${r.percentage}%` : "—"}
                        </td>
                        <td className="border-b-[0.5px] border-border px-2 py-2 bg-navy-100 font-medium">
                          {r.eligible == null ? (
                            <span className="text-ink-faint">—</span>
                          ) : r.eligible ? (
                            <span className="text-navy-900">มีสิทธิ์</span>
                          ) : (
                            <span className="text-danger-strong">ไม่มีสิทธิ์</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-ink-faint">ยังไม่มีนักเรียนในห้องนี้</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-ink-faint">
              กรอกเช็คชื่อได้ทั้งที่หน้า "เช็คชื่อ" ด้านบน หรือผ่าน Google Sheets เหมือนเดิม — ลบตัวอักษรในชีทเพื่อลบบันทึกของวันนั้น
              <br />
              มาเรียนร้อยละ = (จำนวนวันมา + สาย + ขอเวลาเรียน) ÷ (วันเรียนทั้งหมด − วันลา/ทัศนศึกษา/หยุดพิเศษ) × 100 · มีสิทธิ์สอบถ้าร้อยละ ≥ 80 · วันที่ไม่มีการเช็คชื่อนับเป็นวันขาด · วางเมาส์บนสถานะที่มีขีดเส้นใต้เพื่อดูหมายเหตุ
            </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
