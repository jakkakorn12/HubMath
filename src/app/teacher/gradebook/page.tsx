import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import GradebookTable from "./GradebookTable";
import AssignmentManager from "./AssignmentManager";
import EditScoresTable from "./EditScoresTable";
import { SHEET_URL } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<{ section_id?: string; mode?: string }>;
}) {
  const { section_id, mode } = await searchParams;
  const editMode = mode === "edit";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
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
    supabase.from("assignments").select("id, title, display_name, term, category, max_score").eq("subject_id", section.subject_id),
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

  const students = rows.map((r) => ({ code: r.code, number: r.number, name: r.name }));
  const initialScores: Record<string, number | null> = {};
  for (const s of scoreCache ?? []) {
    initialScores[`${s.student_code}__${s.assignment_id}`] = s.score;
  }
  const baseQuery = `?section_id=${section_id}`;

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      <TeacherNav
        sectionId={section_id}
        subjectId={section.subject_id}
        subjectName={subject?.name}
        roomName={section.name}
        active="scores"
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-ink">คะแนนทั้งห้อง ({rows.length} คน)</h1>
          <div className="flex gap-1 text-sm">
            <Link
              href={`/teacher/gradebook${baseQuery}`}
              className={`px-3 py-1.5 rounded-control font-medium ${!editMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-surface"}`}
            >
              ดูสรุป
            </Link>
            <Link
              href={`/teacher/gradebook${baseQuery}&mode=edit`}
              className={`px-3 py-1.5 rounded-control font-medium ${editMode ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-surface"}`}
            >
              แก้ไขคะแนน
            </Link>
          </div>
        </div>

        {!editMode ? (
          <GradebookTable
            rows={rows}
            colLabels={cols.map((c) => c.label)}
            fileName={`คะแนน-${subject?.name ?? "วิชา"}-ห้อง${section.name}`}
            sheetUrl={SHEET_URL}
          />
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h2 className="text-sm font-semibold text-ink-muted mb-3">ช่องคะแนน</h2>
              <AssignmentManager subjectId={section.subject_id} assignments={assign} />
            </div>
            <EditScoresTable
              subjectId={section.subject_id}
              assignments={assign}
              students={students}
              initialScores={initialScores}
            />
          </div>
        )}
      </main>
    </div>
  );
}
