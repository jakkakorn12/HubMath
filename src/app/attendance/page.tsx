import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { AttendanceStatus } from "@/lib/supabase/types";

const statusLabel: Record<AttendanceStatus, string> = {
  present: "มา",
  late: "สาย",
  absent: "ขาด",
  leave: "ลา",
};

const statusColor: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
};

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
    .select("sections(id, name)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .single();

  const section = enrollment?.sections as { id: string; name: string } | null;

  const { data: records } = section
    ? await supabase
        .from("attendance")
        .select("*")
        .eq("student_code", student?.student_code ?? "")
        .eq("section_id", section.id)
        .order("date", { ascending: false })
    : { data: [] };

  const counts: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, leave: 0 };
  for (const r of records ?? []) {
    counts[r.status]++;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/subject?subject_id=${subject_id}`} className="text-blue-600 hover:underline text-sm">← กลับหน้าวิชา</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{subject?.name}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-gray-800">การเข้าเรียน</h1>

        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(statusLabel) as AttendanceStatus[]).map((s) => (
            <div key={s} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <p className={`text-2xl font-bold ${statusColor[s].split(" ")[1]}`}>{counts[s]}</p>
              <p className="text-xs text-gray-400 mt-1">{statusLabel[s]}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">ประวัติ</h2>
          {!records || records.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีข้อมูลการเข้าเรียน</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-700">
                    {new Date(r.date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.method === "qr" && <span className="text-xs text-gray-400">QR</span>}
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
