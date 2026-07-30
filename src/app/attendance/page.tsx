import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import { dedupeAttendance } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const statusLabel: Record<AttendanceStatus, string> = {
  present: "มา",
  late: "สาย",
  absent: "ขาด",
  truant: "หนีเรียน",
  leave: "ลา",
  sick_leave: "ลาป่วย",
  personal_leave: "ลากิจ",
  field_trip: "ทัศนศึกษา",
  school_holiday: "หยุดพิเศษ",
  excused_activity: "ขอเวลาเรียน",
};

const statusColor: Record<AttendanceStatus, string> = {
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

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!subject_id) redirect("/dashboard");

  const { data: student } = await supabase.from("students").select("*").eq("id", user.id).single();

  const { data: subject } = await supabase.from("subjects").select("*").eq("id", subject_id).single();

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(id, name)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .maybeSingle();

  const section = enrollment?.sections as { id: string; name: string } | null;

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู (กันแก้ subject_id ใน URL)
  if (!section) redirect("/dashboard");

  const { data: rawRecords } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_code", student?.student_code ?? "")
    .eq("section_id", section.id)
    .order("date", { ascending: false });

  // วันเดียวกันอาจมีทั้งแถว QR และแถวครูกรอก → ของครูชนะ
  const records = dedupeAttendance(rawRecords ?? [], (r) => r.date);

  const counts: Record<AttendanceStatus, number> = {
    present: 0, late: 0, absent: 0, truant: 0, excused_activity: 0,
    leave: 0, sick_leave: 0, personal_leave: 0, field_trip: 0, school_holiday: 0,
  };
  for (const r of records) {
    counts[r.status]++;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="attendance" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">การเข้าเรียน</h1>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(Object.keys(statusLabel) as AttendanceStatus[]).map((s) => (
            <div key={s} className="bg-white rounded-card border-[0.5px] border-border p-4 text-center">
              <p className={`text-2xl font-bold ${statusColor[s].split(" ")[1]}`}>{counts[s]}</p>
              <p className="text-xs text-ink-faint mt-1">{statusLabel[s]}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">ประวัติ</h2>
          {!records || records.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีข้อมูลการเข้าเรียน</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-2">
                  <span className="text-sm text-ink">
                    {new Date(r.date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.method === "qr" && <span className="text-xs text-ink-faint">QR</span>}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
