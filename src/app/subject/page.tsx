import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SubjectHubPage({
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

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections(id, name)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .single();
  const section = enrollment?.sections as { id: string; name: string } | null;

  const [
    { data: subject },
    { data: assignments },
    { data: submissions },
    { data: scoreCache },
    { data: attendance },
    { data: tasks },
    { data: taskSubs },
    { data: resources },
  ] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("assignments").select("id, max_score").eq("subject_id", subject_id),
    supabase.from("submissions").select("assignment_id, score").eq("student_id", user.id),
    supabase.from("score_cache").select("assignment_id, score").eq("student_code", student?.student_code ?? ""),
    section
      ? supabase.from("attendance").select("status").eq("student_code", student?.student_code ?? "").eq("section_id", section.id)
      : Promise.resolve({ data: [] as { status: string }[] }),
    supabase.from("tasks").select("id").eq("subject_id", subject_id),
    supabase.from("task_submissions").select("task_id").eq("student_id", user.id),
    supabase.from("resources").select("id").eq("subject_id", subject_id),
  ]);

  // คะแนนรวม
  const cacheMap = new Map(scoreCache?.map((s) => [s.assignment_id, s.score]) ?? []);
  const subMap = new Map([...cacheMap, ...(submissions?.map((s) => [s.assignment_id, s.score]) ?? [])]);
  const totalScore = (assignments ?? []).reduce((sum, a) => {
    const sc = subMap.get(a.id);
    return sc != null ? sum + sc : sum;
  }, 0);

  // เวลาเรียน
  const presentCount = (attendance ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const absentCount = (attendance ?? []).filter((a) => a.status === "absent").length;
  const totalDays = (attendance ?? []).length;

  // งานค้าง
  const submittedTaskIds = new Set((taskSubs ?? []).map((s) => s.task_id));
  const pendingTasks = (tasks ?? []).filter((t) => !submittedTaskIds.has(t.id)).length;

  // เอกสาร
  const resourceCount = (resources ?? []).length;

  const subjectTypeLabel: Record<string, string> = {
    basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก",
  };

  const cards = [
    {
      href: `/assignments?subject_id=${subject_id}`,
      title: "คะแนน",
      icon: "📊",
      stat: `${totalScore}/100`,
      note: "คะแนนรวมปัจจุบัน",
      color: "bg-blue-50 border-blue-200",
      statColor: "text-blue-700",
    },
    {
      href: `/attendance?subject_id=${subject_id}`,
      title: "เวลาเรียน",
      icon: "🗓️",
      stat: totalDays > 0 ? `มา ${presentCount} · ขาด ${absentCount}` : "—",
      note: totalDays > 0 ? `บันทึกแล้ว ${totalDays} ครั้ง` : "ยังไม่มีข้อมูล",
      color: "bg-green-50 border-green-200",
      statColor: "text-green-700",
    },
    {
      href: `/tasks?subject_id=${subject_id}`,
      title: "ส่งงาน",
      icon: "📝",
      stat: (tasks ?? []).length === 0 ? "—" : pendingTasks > 0 ? `ค้าง ${pendingTasks} ชิ้น` : "ส่งครบแล้ว",
      note: `งานทั้งหมด ${(tasks ?? []).length} ชิ้น`,
      color: "bg-purple-50 border-purple-200",
      statColor: pendingTasks > 0 ? "text-purple-700" : "text-green-700",
    },
    {
      href: `/resources?subject_id=${subject_id}`,
      title: "เอกสารประกอบการเรียน",
      icon: "📁",
      stat: resourceCount > 0 ? `${resourceCount} ไฟล์` : "—",
      note: resourceCount > 0 ? "ดาวน์โหลดได้" : "ยังไม่มีไฟล์",
      color: "bg-orange-50 border-orange-200",
      statColor: "text-orange-700",
    },
  ];

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
              <span className="text-gray-400">ชั้น</span>
              <p className="font-semibold text-gray-800 mt-0.5">
                {student?.class_level ?? "—"} ห้อง {section?.name ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* การ์ด 2x2 */}
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`rounded-2xl border p-5 hover:shadow-md transition-shadow ${card.color}`}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="font-semibold text-gray-800 text-sm">{card.title}</h3>
              <p className={`text-lg font-bold mt-2 ${card.statColor}`}>{card.stat}</p>
              <p className="text-xs text-gray-400 mt-1">{card.note}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
