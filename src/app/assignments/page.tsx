import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { AssignmentCategory } from "@/lib/supabase/types";

const categoryLabel: Record<AssignmentCategory, string> = {
  practice:   "งานฝึก / สอบย่อย",
  midterm:    "กลางภาค",
  final:      "ปลายภาค",
  competency: "สมรรถนะ",
};

const categoryColor: Record<AssignmentCategory, string> = {
  practice:   "bg-blue-50 border-blue-200",
  midterm:    "bg-yellow-50 border-yellow-200",
  final:      "bg-red-50 border-red-200",
  competency: "bg-green-50 border-green-200",
};

const categoryTextColor: Record<AssignmentCategory, string> = {
  practice:   "text-blue-700",
  midterm:    "text-yellow-700",
  final:      "text-red-700",
  competency: "text-green-700",
};

export default async function AssignmentsPage({
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

  const [{ data: subject }, { data: assignments }, { data: submissions }, { data: enrollment }, { data: scoreCache }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("id", subject_id).single(),
      supabase.from("assignments").select("*").eq("subject_id", subject_id)
        .order("term").order("category").order("created_at"),
      supabase.from("submissions").select("assignment_id, score").eq("student_id", user.id),
      supabase.from("student_sections")
        .select("sections(name)")
        .eq("student_id", user.id)
        .eq("sections.subject_id", subject_id)
        .limit(1)
        .single(),
      supabase.from("score_cache").select("assignment_id, score").eq("student_code", student?.student_code ?? ""),
    ]);

  // merge: score_cache เป็น fallback ถ้ายังไม่มีใน submissions
  const cacheMap = new Map(scoreCache?.map((s) => [s.assignment_id, s.score]) ?? []);
  const subMap = new Map([...cacheMap, ...(submissions?.map((s) => [s.assignment_id, s.score]) ?? [])]);

  const roomName = (enrollment?.sections as { name: string } | null)?.name ?? "—";

  const subjectTypeLabel: Record<string, string> = {
    basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก",
  };

  // คำนวณคะแนนสรุปตาม category + term
  function calcScore(filterFn: (a: typeof assignments[0]) => boolean) {
    const list = (assignments ?? []).filter(filterFn);
    const max = list.reduce((s, a) => s + a.max_score, 0);
    const scored = list.reduce((s, a) => {
      const sc = subMap.get(a.id);
      return sc != null ? s + sc : s;
    }, 0);
    return { max, scored };
  }

  const practice1 = calcScore((a) => a.term === 1 && a.category === "practice");
  const midterm   = calcScore((a) => a.term === 1 && a.category === "midterm");
  const practice2 = calcScore((a) => a.term === 2 && a.category === "practice");
  const competency = calcScore((a) => a.category === "competency");
  const final_    = calcScore((a) => a.category === "final");

  // จัดกลุ่ม term → category
  const grouped: Record<number, Record<string, typeof assignments>> = {};
  for (const a of assignments ?? []) {
    if (!grouped[a.term]) grouped[a.term] = {};
    if (!grouped[a.term][a.category]) grouped[a.term][a.category] = [];
    grouped[a.term][a.category]!.push(a);
  }

  const summaryItems = [
    { label: "คะแนนเก็บ 1", ...practice1, color: "blue" },
    { label: "กลางภาค",     ...midterm,   color: "yellow" },
    { label: "คะแนนเก็บ 2", ...practice2, color: "blue" },
    { label: "สมรรถนะ",     ...competency, color: "green" },
    { label: "ปลายภาค",     ...final_,    color: "red" },
  ];

  const colorMap: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-200 text-blue-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    green:  "bg-green-50 border-green-200 text-green-800",
    red:    "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">
            {subject?.name}
            <span className="text-gray-400 font-normal text-sm ml-1">
              ({subjectTypeLabel[subject?.type ?? ""]})
            </span>
          </span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ข้อมูลนักเรียน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="text-gray-400">ชื่อ</span>
              <p className="font-semibold text-gray-800 mt-0.5">{student?.full_name ?? "—"}</p>
            </div>
            <div>
              <span className="text-gray-400">เลขที่</span>
              <p className="font-semibold text-gray-800 mt-0.5">{student?.student_number ?? "—"}</p>
            </div>
            <div>
              <span className="text-gray-400">ชั้น</span>
              <p className="font-semibold text-gray-800 mt-0.5">
                {student?.class_level ?? "—"} ห้อง {roomName}
              </p>
            </div>
            <div>
              <span className="text-gray-400">เลขประจำตัว</span>
              <p className="font-semibold text-gray-800 mt-0.5">{student?.student_code ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* ตารางสรุปคะแนน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">สรุปคะแนน</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {summaryItems.map((item) => (
                    <th key={item.label} className="border border-gray-200 px-3 py-2 font-medium text-gray-600">
                      {item.label}
                    </th>
                  ))}
                  <th className="border border-gray-200 px-3 py-2 font-semibold text-gray-800 bg-gray-100">รวม</th>
                </tr>
                <tr className="text-xs text-gray-400">
                  {summaryItems.map((item) => (
                    <td key={item.label} className="border border-gray-200 px-3 py-1">
                      /{item.max}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-3 py-1 bg-gray-50">
                    /{summaryItems.reduce((s, i) => s + i.max, 0)}
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {summaryItems.map((item) => (
                    <td key={item.label} className="border border-gray-200 px-3 py-3 font-bold text-gray-800 text-base">
                      {item.scored > 0 ? item.scored : "—"}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-3 py-3 font-bold text-blue-700 text-base bg-blue-50">
                    {summaryItems.reduce((s, i) => s + i.scored, 0) > 0
                      ? summaryItems.reduce((s, i) => s + i.scored, 0)
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* รายละเอียดแต่ละครึ่ง */}
        {[1, 2].map((term) => {
          const termData = grouped[term];
          if (!termData) return null;
          return (
            <div key={term}>
              <h2 className="text-base font-bold text-gray-600 mb-3">
                {term === 1 ? "ครึ่งแรก" : "ครึ่งหลัง"}
              </h2>
              <div className="space-y-3">
                {(["practice", "midterm", "competency", "final"] as AssignmentCategory[]).map((cat) => {
                  const items = termData[cat];
                  if (!items || items.length === 0) return null;
                  const catMax = items.reduce((s, a) => s + a.max_score, 0);
                  const catScore = items.reduce((s, a) => {
                    const sc = subMap.get(a.id);
                    return sc != null ? s + sc : s;
                  }, 0);
                  return (
                    <div key={cat} className={`rounded-xl border p-4 ${categoryColor[cat]}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-semibold text-sm ${categoryTextColor[cat]}`}>
                          {categoryLabel[cat]}
                        </span>
                        <span className="text-sm font-bold text-gray-600">
                          {catScore}/{catMax}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((a) => {
                          const score = subMap.get(a.id);
                          return (
                            <div
                              key={a.id}
                              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm"
                            >
                              <span className="text-sm text-gray-700">{a.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">/{a.max_score}</span>
                                <span className={`text-sm font-bold w-8 text-right ${score != null ? "text-gray-800" : "text-gray-300"}`}>
                                  {score != null ? score : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
