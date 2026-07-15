import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import QrButton from "@/components/QrButton";

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");
  if (!section_id) redirect("/teacher/dashboard");

  const { data: section } = await supabase
    .from("sections")
    .select("id, name, subject_id, subjects(name)")
    .eq("id", section_id)
    .single();
  if (!section) redirect("/teacher/dashboard");

  const subject = section.subjects as { name: string } | null;

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayAtt } = await supabase
    .from("attendance")
    .select("status")
    .eq("section_id", section_id)
    .eq("date", today);

  const present = (todayAtt ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const absent = (todayAtt ?? []).filter((a) => a.status === "absent").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNav
        sectionId={section_id}
        subjectId={section.subject_id}
        subjectName={subject?.name}
        roomName={section.name}
        active="attendance"
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-gray-800">เช็คชื่อ</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-1">วันนี้</h2>
          <p className="text-sm text-gray-600">
            มา/สาย {present} คน · ขาด {absent} คน · บันทึกแล้ว {(todayAtt ?? []).length} คน
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">QR เช็คชื่อ (นักเรียนสแกนเพื่อบันทึกว่ามาเรียน)</h2>
          <QrButton sectionId={section_id} teacherId={teacher.id} />
        </div>

        <p className="text-xs text-gray-400">
          หมายเหตุ: การเช็คชื่อรายวันแบบละเอียด (มา/สาย/ขาด/ลา) กรอกผ่าน Google Sheets ได้เช่นเดิม
        </p>
      </main>
    </div>
  );
}
