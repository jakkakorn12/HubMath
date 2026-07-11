import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TaskSubmissionsPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/teacher/tasks?subject_id=${subject?.id}`} className="text-blue-600 hover:underline text-sm">
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
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                      ⚠ อาจซ้ำกับคนอื่น
                    </span>
                  )}
                </div>
                {s.file_name ? (
                  <a href={fileLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    📎 {s.file_name}
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
      </main>
    </div>
  );
}
