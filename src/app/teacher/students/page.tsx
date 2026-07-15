import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TeacherStudentsPage({
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
    .select("id, name, subjects(name)")
    .eq("id", section_id)
    .single();
  if (!section) redirect("/teacher/dashboard");

  const subject = section.subjects as { name: string } | null;

  const { data: rosterEnroll } = await supabase
    .from("roster_enrollments")
    .select("student_code, student_number")
    .eq("section_id", section_id);

  const codes = (rosterEnroll ?? []).map((r) => r.student_code);

  const [{ data: roster }, { data: registered }] = await Promise.all([
    codes.length ? supabase.from("student_roster").select("student_code, full_name").in("student_code", codes) : Promise.resolve({ data: [] as { student_code: string; full_name: string }[] }),
    codes.length ? supabase.from("students").select("student_code").in("student_code", codes) : Promise.resolve({ data: [] as { student_code: string }[] }),
  ]);

  const nameByCode = new Map((roster ?? []).map((r) => [r.student_code, r.full_name]));
  const registeredCodes = new Set((registered ?? []).map((s) => s.student_code));

  const rows = (rosterEnroll ?? [])
    .map((r) => ({
      code: r.student_code,
      number: r.student_number ?? 0,
      name: nameByCode.get(r.student_code) ?? "—",
      registered: registeredCodes.has(r.student_code),
    }))
    .sort((a, b) => a.number - b.number);

  const registeredCount = rows.filter((r) => r.registered).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{subject?.name} · ห้อง {section.name}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-1">รายชื่อนักเรียน ({rows.length} คน)</h1>
        <p className="text-sm text-gray-400 mb-4">สมัครแล้ว {registeredCount} · ยังไม่สมัคร {rows.length - registeredCount}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="px-3 py-2 w-14 text-center">เลขที่</th>
                <th className="px-3 py-2">ชื่อ</th>
                <th className="px-3 py-2">เลขประจำตัว</th>
                <th className="px-3 py-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-center text-gray-500">{r.number || "—"}</td>
                  <td className="px-3 py-2 text-gray-800">{r.name}</td>
                  <td className="px-3 py-2 text-gray-500">{r.code}</td>
                  <td className="px-3 py-2 text-center">
                    {r.registered ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">สมัครแล้ว</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">ยังไม่สมัคร</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">ยังไม่มีนักเรียนในห้องนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
