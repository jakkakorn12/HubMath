import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import QrButton from "@/components/QrButton";

export const dynamic = "force-dynamic";

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

  let present = 0, absent = 0, total = 0;
  if (section_id) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayAtt } = await supabase
      .from("attendance")
      .select("status")
      .eq("section_id", section_id)
      .eq("date", today);
    present = (todayAtt ?? []).filter((a) => a.status === "present" || a.status === "late").length;
    absent = (todayAtt ?? []).filter((a) => a.status === "absent").length;
    total = (todayAtt ?? []).length;
  }

  // มี section_id = เข้าจาก shell ของห้อง → ใช้แท็บห้อง ไม่ต้องเลือกวิชา/ห้องใหม่
  const inRoomShell = !!(section_id && subject_id);
  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = (sections ?? []).find((s) => s.id === section_id)?.name;

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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-1">วันนี้</h2>
              <p className="text-sm text-gray-600">มา/สาย {present} คน · ขาด {absent} คน · บันทึกแล้ว {total} คน</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">QR เช็คชื่อ (นักเรียนสแกนเพื่อบันทึกว่ามาเรียน)</h2>
              <QrButton sectionId={section_id} teacherId={teacher.id} />
            </div>
            <p className="text-xs text-gray-400">
              หมายเหตุ: การเช็คชื่อรายวันแบบละเอียด (มา/สาย/ขาด/ลา) กรอกผ่าน Google Sheets ได้เช่นเดิม
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
