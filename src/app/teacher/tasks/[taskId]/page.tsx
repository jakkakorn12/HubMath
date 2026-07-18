import { redirect } from "next/navigation";
import { AlertTriangle, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TaskSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { taskId } = await params;
  const { section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const { data: task } = await supabase.from("tasks").select("*, subjects(name, id)").eq("id", taskId).single();
  if (!task) redirect("/teacher/dashboard");

  const { data: submissions } = await supabase
    .from("task_submissions")
    .select("*, students(full_name, student_code)")
    .eq("task_id", taskId)
    .order("submitted_at", { ascending: false });

  const hashCounts: Record<string, number> = {};
  for (const s of submissions ?? []) {
    if (s.content_hash) hashCounts[s.content_hash] = (hashCounts[s.content_hash] ?? 0) + 1;
  }

  const fileLinks = new Map<string, string>();
  for (const s of submissions ?? []) {
    if (s.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(s.file_url, 3600);
      if (data) fileLinks.set(s.id, data.signedUrl);
    }
  }

  const subject = task.subjects as { name: string; id: string } | null;

  // ── หาว่าใครยังไม่ส่ง ──
  // งานผูกห้อง → เทียบกับ roster ห้องนั้น / งานทั้งวิชา → เทียบทุกห้องในวิชา
  const { data: subjectSections } = await supabase
    .from("sections")
    .select("id, name")
    .eq("subject_id", task.subject_id);
  const targetSections = (subjectSections ?? []).filter(
    (s) => task.section_id == null || s.id === task.section_id
  );
  const roomNameBySection = new Map(targetSections.map((s) => [s.id, s.name]));
  const targetSectionIds = targetSections.map((s) => s.id);

  const { data: rosterEnroll } = targetSectionIds.length
    ? await supabase
        .from("roster_enrollments")
        .select("student_code, student_number, section_id")
        .in("section_id", targetSectionIds)
    : { data: [] as { student_code: string; student_number: number | null; section_id: string }[] };

  const rosterCodes = [...new Set((rosterEnroll ?? []).map((r) => r.student_code))];
  const { data: rosterNames } = rosterCodes.length
    ? await supabase.from("student_roster").select("student_code, full_name").in("student_code", rosterCodes)
    : { data: [] as { student_code: string; full_name: string }[] };
  const nameByCode = new Map((rosterNames ?? []).map((r) => [r.student_code, r.full_name]));

  const submittedCodes = new Set(
    (submissions ?? [])
      .map((s) => (s.students as { student_code: string } | null)?.student_code)
      .filter(Boolean)
  );

  const missing = (rosterEnroll ?? [])
    .filter((r) => !submittedCodes.has(r.student_code))
    .map((r) => ({
      code: r.student_code,
      number: r.student_number ?? 0,
      name: nameByCode.get(r.student_code) ?? "—",
      room: roomNameBySection.get(r.section_id) ?? "?",
    }))
    .sort((a, b) => a.room.localeCompare(b.room, "th", { numeric: true }) || a.number - b.number);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/teacher/tasks?subject_id=${subject?.id}${section_id ? `&section_id=${section_id}` : ""}`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← กลับ
          </Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{task.title}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-800">งานที่ส่ง ({submissions?.length ?? 0} คน)</h1>

        {!submissions || submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            ยังไม่มีนักเรียนส่งงาน
          </div>
        ) : (
          submissions.map((s) => {
            const student = s.students as { full_name: string; student_code: string } | null;
            const isDuplicate = s.content_hash && hashCounts[s.content_hash] > 1;
            const fileLink = fileLinks.get(s.id);
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl shadow-sm border p-5 ${isDuplicate ? "border-red-300" : "border-gray-100"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{student?.full_name}</p>
                    <p className="text-xs text-gray-400">{student?.student_code}</p>
                  </div>
                  {isDuplicate && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3" />
                      อาจซ้ำกับคนอื่น
                    </span>
                  )}
                </div>
                {s.file_name ? (
                  <a
                    href={fileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {s.file_name}
                  </a>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                    {s.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  ส่งเมื่อ {new Date(s.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            );
          })
        )}

        {/* ยังไม่ส่ง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            ยังไม่ส่ง <span className="text-gray-400 font-normal">({missing.length} คน)</span>
          </h2>
          {missing.length === 0 ? (
            <p className="text-sm text-green-700">ส่งครบทุกคนแล้ว</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {missing.map((m) => (
                <div key={`${m.room}-${m.code}`} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-16 shrink-0">
                    ห้อง {m.room} · {m.number || "—"}
                  </span>
                  <span className="text-gray-700 truncate">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
