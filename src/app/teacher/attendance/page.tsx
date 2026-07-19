import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import QrButton from "@/components/QrButton";
import { dedupeAttendance } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "มา", late: "สาย", absent: "ขาด", leave: "ลา", truant: "หนีเรียน",
};
const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  truant: "bg-red-200 text-red-800",
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
  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
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
    <div className="min-h-screen bg-gray-50">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            เลือกวิชาและห้องด้านบนเพื่อเช็คชื่อ
          </div>
        ) : (
          <div className="space-y-5">
            {/* สรุปวันนี้ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                วันนี้ ({new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long" })})
              </h2>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <span key={s} className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_CHIP[s]}`}>
                    {STATUS_LABEL[s]} {todayCounts[s]}
                  </span>
                ))}
                <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">
                  ยังไม่เช็ค {notCheckedToday}
                </span>
              </div>
            </div>

            {/* QR */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">QR เช็คชื่อ (นักเรียนสแกนเพื่อบันทึกว่ามาเรียน)</h2>
              <QrButton sectionId={section_id} teacherId={teacher.id} />
            </div>

            {/* ตารางรายบุคคล */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">
                สรุปรายบุคคล <span className="font-normal text-gray-400">(บันทึกแล้ว {recordedDays} วัน)</span>
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto max-h-[70vh]">
                <table className="w-full text-sm text-center border-separate border-spacing-0 min-w-[640px]">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 w-12">เลขที่</th>
                      <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left">ชื่อ</th>
                      <th className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-2 py-2 font-semibold">วันนี้</th>
                      {STATUS_ORDER.map((s) => (
                        <th key={s} className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 font-medium whitespace-nowrap">
                          {STATUS_LABEL[s]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code}>
                        <td className="border-b border-gray-100 px-2 py-2 text-gray-500">{r.number || "—"}</td>
                        <td className="border-b border-gray-100 px-3 py-2 text-left text-gray-800">{r.name}</td>
                        <td className="border-b border-gray-100 px-2 py-2 bg-gray-50/50">
                          {r.today ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CHIP[r.today]}`}>
                              {STATUS_LABEL[r.today]}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {STATUS_ORDER.map((s) => (
                          <td
                            key={s}
                            className={`border-b border-gray-100 px-2 py-2 ${
                              r.totals[s] > 0
                                ? s === "absent" || s === "truant"
                                  ? "text-red-600 font-semibold"
                                  : "text-gray-700"
                                : "text-gray-300"
                            }`}
                          >
                            {r.totals[s] > 0 ? r.totals[s] : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-gray-400">ยังไม่มีนักเรียนในห้องนี้</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              การเช็คชื่อรายวัน (ม/ส/ข/ล/น) กรอกผ่าน Google Sheets — ลบตัวอักษรในชีทเพื่อลบบันทึกของวันนั้น
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
