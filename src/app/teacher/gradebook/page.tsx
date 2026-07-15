import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";

export default async function GradebookPage({
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
    .select("id, name, subject_id, subjects(id, name)")
    .eq("id", section_id)
    .single();
  if (!section) redirect("/teacher/dashboard");

  const subject = section.subjects as { id: string; name: string } | null;

  const { data: rosterEnroll } = await supabase
    .from("roster_enrollments")
    .select("student_code, student_number")
    .eq("section_id", section_id);

  const codes = (rosterEnroll ?? []).map((r) => r.student_code);
  const numberByCode = new Map((rosterEnroll ?? []).map((r) => [r.student_code, r.student_number]));

  const [{ data: roster }, { data: assignments }, { data: scoreCache }] = await Promise.all([
    codes.length ? supabase.from("student_roster").select("student_code, full_name").in("student_code", codes) : Promise.resolve({ data: [] as { student_code: string; full_name: string }[] }),
    supabase.from("assignments").select("id, term, category, max_score").eq("subject_id", section.subject_id),
    codes.length ? supabase.from("score_cache").select("assignment_id, student_code, score").in("student_code", codes) : Promise.resolve({ data: [] as { assignment_id: string; student_code: string; score: number | null }[] }),
  ]);

  const nameByCode = new Map((roster ?? []).map((r) => [r.student_code, r.full_name]));
  const scoreMap = new Map((scoreCache ?? []).map((s) => [`${s.student_code}__${s.assignment_id}`, s.score]));

  const assign = assignments ?? [];
  const bucketMax = (fn: (a: (typeof assign)[0]) => boolean) => assign.filter(fn).reduce((s, a) => s + a.max_score, 0);
  const maxKeep1 = bucketMax((a) => a.term === 1 && a.category === "practice");
  const maxMid = bucketMax((a) => a.term === 1 && a.category === "midterm");
  const maxKeep2 = bucketMax((a) => a.term === 2 && a.category === "practice");
  const maxComp = bucketMax((a) => a.category === "competency");
  const maxFinal = bucketMax((a) => a.category === "final");

  function scoreFor(code: string, fn: (a: (typeof assign)[0]) => boolean) {
    return assign.filter(fn).reduce((sum, a) => {
      const sc = scoreMap.get(`${code}__${a.id}`);
      return sc != null ? sum + sc : sum;
    }, 0);
  }

  const rows = codes
    .map((code) => {
      const keep1 = scoreFor(code, (a) => a.term === 1 && a.category === "practice");
      const mid = scoreFor(code, (a) => a.term === 1 && a.category === "midterm");
      const keep2 = scoreFor(code, (a) => a.term === 2 && a.category === "practice");
      const comp = scoreFor(code, (a) => a.category === "competency");
      const fin = scoreFor(code, (a) => a.category === "final");
      return {
        code,
        number: numberByCode.get(code) ?? 0,
        name: nameByCode.get(code) ?? "—",
        keep1, mid, keep2, comp, fin,
        total: keep1 + mid + keep2 + comp + fin,
      };
    })
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const cols = [
    { label: `เก็บ1/${maxKeep1}`, key: "keep1" as const },
    { label: `กลางภาค/${maxMid}`, key: "mid" as const },
    { label: `เก็บ2/${maxKeep2}`, key: "keep2" as const },
    { label: `สมรรถนะ/${maxComp}`, key: "comp" as const },
    { label: `ปลายภาค/${maxFinal}`, key: "fin" as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNav
        sectionId={section_id}
        subjectId={section.subject_id}
        subjectName={subject?.name}
        roomName={section.name}
        active="scores"
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-4">คะแนนทั้งห้อง ({rows.length} คน)</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-center border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="border border-gray-200 px-2 py-2 w-12">เลขที่</th>
                <th className="border border-gray-200 px-3 py-2 text-left">ชื่อ</th>
                {cols.map((c) => (
                  <th key={c.key} className="border border-gray-200 px-2 py-2 font-medium whitespace-nowrap">{c.label}</th>
                ))}
                <th className="border border-gray-200 px-2 py-2 font-semibold bg-gray-100">รวม/100</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-2 text-gray-500">{r.number || "—"}</td>
                  <td className="border border-gray-200 px-3 py-2 text-left text-gray-800">{r.name}</td>
                  {cols.map((c) => (
                    <td key={c.key} className="border border-gray-200 px-2 py-2 text-gray-700">
                      {r[c.key] > 0 ? r[c.key] : "—"}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-2 py-2 font-bold text-blue-700 bg-blue-50">
                    {r.total > 0 ? r.total : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 3} className="border border-gray-200 px-3 py-6 text-gray-400">
                    ยังไม่มีนักเรียนในห้องนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
