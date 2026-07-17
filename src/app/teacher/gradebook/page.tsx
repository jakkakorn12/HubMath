import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import GradebookTable from "./GradebookTable";
import { SHEET_URL, SHEET_TAB_BY_SUBJECT } from "@/lib/sheets";

export const dynamic = "force-dynamic";

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

  // คืนค่า { sum, has } — has=true ถ้ามีการกรอกอย่างน้อย 1 ช่องในกลุ่มนี้ (แม้กรอก 0)
  function bucketFor(code: string, fn: (a: (typeof assign)[0]) => boolean) {
    let sum = 0;
    let has = false;
    for (const a of assign.filter(fn)) {
      const key = `${code}__${a.id}`;
      if (scoreMap.has(key)) {
        has = true;
        sum += scoreMap.get(key) ?? 0;
      }
    }
    return { sum, has };
  }

  const rows = codes
    .map((code) => {
      const keep1 = bucketFor(code, (a) => a.term === 1 && a.category === "practice");
      const mid = bucketFor(code, (a) => a.term === 1 && a.category === "midterm");
      const keep2 = bucketFor(code, (a) => a.term === 2 && a.category === "practice");
      const comp = bucketFor(code, (a) => a.category === "competency");
      const fin = bucketFor(code, (a) => a.category === "final");
      const anyScore = keep1.has || mid.has || keep2.has || comp.has || fin.has;
      return {
        code,
        number: numberByCode.get(code) ?? 0,
        name: nameByCode.get(code) ?? "—",
        keep1, mid, keep2, comp, fin,
        anyScore,
        total: keep1.sum + mid.sum + keep2.sum + comp.sum + fin.sum,
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-800">คะแนนทั้งห้อง ({rows.length} คน)</h1>

        {/* กล่องหมายเหตุ: แก้คะแนนต้องไปที่ Google Sheets */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-amber-800 flex-1 min-w-[200px]">
            หน้านี้เป็นมุมมองอย่างเดียว — การกรอก/แก้คะแนนทำที่ Google Sheets
            {SHEET_TAB_BY_SUBJECT[section.subject_id] && (
              <> แท็บ <span className="font-semibold">{SHEET_TAB_BY_SUBJECT[section.subject_id]}</span></>
            )}{" "}
            แล้วระบบจะอัปเดตให้อัตโนมัติ
          </p>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-white border border-amber-300 text-amber-800 text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors"
          >
            เปิด Google Sheets
          </a>
        </div>

        <GradebookTable rows={rows} colLabels={cols.map((c) => c.label)} />
      </main>
    </div>
  );
}
