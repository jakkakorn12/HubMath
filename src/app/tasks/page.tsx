import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SubmitForm from "./SubmitForm";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!subject_id) redirect("/dashboard");

  const [{ data: subject }, { data: tasks }, { data: submissions }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("tasks").select("*").eq("subject_id", subject_id).order("due_date"),
    supabase.from("task_submissions").select("*").eq("student_id", user.id),
  ]);

  const subMap = new Map(submissions?.map((s) => [s.task_id, s]) ?? []);

  const fileLinks = new Map<string, string>();
  for (const s of submissions ?? []) {
    if (s.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(s.file_url, 3600);
      if (data) fileLinks.set(s.task_id, data.signedUrl);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← กลับหน้าหลัก</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{subject?.name}</span>
          <span className="text-gray-300">|</span>
          <Link href={`/assignments?subject_id=${subject_id}`} className="text-blue-600 hover:underline text-sm">ดูคะแนน</Link>
          <Link href={`/resources?subject_id=${subject_id}`} className="text-blue-600 hover:underline text-sm">คลังไฟล์</Link>
          <Link href={`/attendance?subject_id=${subject_id}`} className="text-blue-600 hover:underline text-sm">การเข้าเรียน</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-gray-800">งานที่มอบหมาย</h1>

        {!tasks || tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            ยังไม่มีงานที่มอบหมาย
          </div>
        ) : (
          tasks.map((task) => {
            const submission = subMap.get(task.id);
            const fileLink = fileLinks.get(task.id);
            const overdue = task.due_date ? new Date(task.due_date) < new Date() : false;
            return (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-gray-800">{task.title}</h2>
                  {submission && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      ส่งแล้ว
                    </span>
                  )}
                </div>
                {task.description && <p className="text-sm text-gray-500 mb-2">{task.description}</p>}
                {task.due_date && (
                  <p className={`text-xs mb-3 ${overdue ? "text-red-500" : "text-gray-400"}`}>
                    กำหนดส่ง: {new Date(task.due_date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    {overdue && " (เลยกำหนด)"}
                  </p>
                )}

                {submission && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-sm">
                    {submission.file_name ? (
                      <a href={fileLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        📎 {submission.file_name}
                      </a>
                    ) : (
                      <p className="text-gray-600 whitespace-pre-wrap">{submission.content}</p>
                    )}
                  </div>
                )}

                <SubmitForm
                  taskId={task.id}
                  studentId={user.id}
                  existingContent={submission?.content ?? null}
                  existingFileName={submission?.file_name ?? null}
                />
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
