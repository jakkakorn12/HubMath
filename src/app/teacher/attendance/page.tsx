import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import QrButton from "@/components/QrButton";
import { dedupeAttendance } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

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
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
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

    // นักเรียน+วันเดียวกันอาจมีทั้งแถว QR และครูกรอก → ของครูชนะ
    const att = dedupeAttendance(attRaw ?? [], (a) => `${a.student_code}__${a.date}`);
    const today = new Date().toISOString().slice(0, 10);
    recordedDays = new Set(att.map((a) => a.date)).size;

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
  }

  return (
    <div className="min-h-screen bg-surface">
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

            {/* QR */}
            <div className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h2 className="text-sm font-semibold text-ink-muted mb-3">QR เช็คชื่อ (นักเรียนสแกนเพื่อบันทึกว่ามาเรียน)</h2>
              <QrButton sectionId={section_id} teacherId={teacher.id} />
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
              การเช็คชื่อรายวัน (ม/ส/ข/ล/น) กรอกผ่าน Google Sheets — ลบตัวอักษรในชีทเพื่อลบบันทึกของวันนั้น
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
