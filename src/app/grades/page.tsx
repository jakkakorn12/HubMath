import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import { categoryTitle } from "@/lib/categoryTitles";
import type { AssignmentCategory } from "@/lib/supabase/types";

const categoryLabel: Record<AssignmentCategory, string> = {
  practice:   "งานฝึก / สอบย่อย",
  midterm:    "กลางภาค",
  final:      "ปลายภาค",
  competency: "สมรรถนะ",
};


export const dynamic = "force-dynamic";

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

  // เช็คว่าลงทะเบียนวิชานี้จริง (กันแก้ subject_id ใน URL)
  // ใช้ !inner เพื่อกรองเฉพาะ enrollment ของวิชานี้ (นักเรียนมีได้หลายวิชา)
  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(name)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .maybeSingle();
  if (!enrollment?.sections) redirect("/dashboard");

  const [{ data: subject }, { data: assignments }, { data: submissions }, { data: scoreCache }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("id", subject_id).single(),
      supabase.from("assignments").select("*").eq("subject_id", subject_id)
        .order("term").order("category").order("created_at"),
      supabase.from("submissions").select("assignment_id, score").eq("student_id", user.id),
      supabase.from("score_cache").select("assignment_id, score").eq("student_code", student?.student_code ?? ""),
    ]);

  // merge: score_cache เป็น fallback ถ้ายังไม่มีใน submissions
  const cacheMap = new Map(scoreCache?.map((s) => [s.assignment_id, s.score]) ?? []);
  const subMap = new Map([...cacheMap, ...(submissions?.map((s) => [s.assignment_id, s.score]) ?? [])]);

  const roomName = (enrollment?.sections as { name: string } | null)?.name ?? "—";

  // คำนวณคะแนนสรุปตาม category + term
  // has = true ถ้ามีการกรอกอย่างน้อย 1 ช่อง (แม้กรอก 0)
  // gradedMax = คะแนนเต็มเฉพาะส่วนที่ตัดคะแนนไปแล้ว
  function calcScore(filterFn: (a: typeof assignments[0]) => boolean) {
    const list = (assignments ?? []).filter(filterFn);
    const max = list.reduce((s, a) => s + a.max_score, 0);
    let scored = 0;
    let gradedMax = 0;
    let has = false;
    for (const a of list) {
      if (subMap.has(a.id)) {
        has = true;
        scored += subMap.get(a.id) ?? 0;
        gradedMax += a.max_score;
      }
    }
    return { max, scored, gradedMax, has };
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
  // เรียงตามชื่อภายใน (ฝึก 1 → ฝึก 4 → สอบ) — created_at จาก seed ไม่นิ่งพอ
  for (const term of Object.values(grouped)) {
    for (const list of Object.values(term)) {
      list!.sort((a, b) => a.title.localeCompare(b.title, "th", { numeric: true }));
    }
  }

  const summaryItems = [
    { label: "คะแนนเก็บ 1", ...practice1 },
    { label: "กลางภาค",     ...midterm },
    { label: "คะแนนเก็บ 2", ...practice2 },
    { label: "สมรรถนะ",     ...competency },
    { label: "ปลายภาค",     ...final_ },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="scores" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ข้อมูลนักเรียน */}
        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="text-ink-faint">ชื่อ</span>
              <p className="font-semibold text-ink mt-0.5">{student?.full_name ?? "—"}</p>
            </div>
            <div>
              <span className="text-ink-faint">เลขที่</span>
              <p className="font-semibold text-ink mt-0.5">{student?.student_number ?? "—"}</p>
            </div>
            <div>
              <span className="text-ink-faint">ชั้น</span>
              <p className="font-semibold text-ink mt-0.5">
                {student?.class_level ?? "—"} ห้อง {roomName}
              </p>
            </div>
            <div>
              <span className="text-ink-faint">เลขประจำตัว</span>
              <p className="font-semibold text-ink mt-0.5">{student?.student_code ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* ตารางสรุปคะแนน */}
        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">สรุปคะแนน</h2>

          {(() => {
            const totalScored = summaryItems.reduce((s, i) => s + i.scored, 0);
            const totalGradedMax = summaryItems.reduce((s, i) => s + i.gradedMax, 0);
            if (totalGradedMax === 0) return null;
            const pct = Math.round((totalScored / totalGradedMax) * 100);
            return (
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-2xl font-bold text-ink">
                    {totalScored}
                    <span className="text-base font-medium text-ink-faint">/{totalGradedMax}</span>
                  </p>
                  <p className="text-xs text-ink-faint">จากคะแนนที่ตัดไปแล้ว ({pct}%)</p>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-navy-900"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr className="bg-surface">
                  {summaryItems.map((item) => (
                    <th key={item.label} className="border-[0.5px] border-border px-3 py-2 font-medium text-ink-muted">
                      {item.label}
                    </th>
                  ))}
                  <th className="border-[0.5px] border-border px-3 py-2 font-semibold text-ink bg-surface">รวม</th>
                </tr>
                <tr className="text-xs text-ink-faint">
                  {summaryItems.map((item) => (
                    <td key={item.label} className="border-[0.5px] border-border px-3 py-1">
                      {item.max}
                    </td>
                  ))}
                  <td className="border-[0.5px] border-border px-3 py-1 bg-surface">
                    {summaryItems.reduce((s, i) => s + i.max, 0)}
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {summaryItems.map((item) => (
                    <td key={item.label} className="border-[0.5px] border-border px-3 py-3 font-bold text-ink text-base">
                      {item.has ? item.scored : "—"}
                    </td>
                  ))}
                  <td className="border-[0.5px] border-border px-3 py-3 font-bold text-ink text-base bg-surface">
                    {summaryItems.some((i) => i.has)
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
              <h2 className="text-base font-bold text-ink-muted mb-3">
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
                    <div key={cat} className="rounded-card border-[0.5px] border-border bg-white shadow-sm p-5">
                      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b-[0.5px] border-border">
                        <span className="font-semibold text-sm text-ink">
                          {categoryTitle(subject_id, term, cat, categoryLabel[cat])}
                        </span>
                        <span className="text-base font-bold text-ink shrink-0">
                          {catScore}<span className="text-sm font-medium text-ink-faint">/{catMax}</span>
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((a) => {
                          const score = subMap.get(a.id);
                          return (
                            <div
                              key={a.id}
                              className="flex items-center justify-between bg-white shadow-sm rounded-control px-3 py-2.5"
                            >
                              <span className="text-sm text-ink">{a.display_name ?? a.title}</span>
                              <span className="text-sm shrink-0 whitespace-nowrap">
                                <span className={`font-bold ${score != null ? "text-ink" : "text-border"}`}>
                                  {score != null ? score : "—"}
                                </span>
                                <span className="text-ink-faint">/{a.max_score}</span>
                              </span>
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
