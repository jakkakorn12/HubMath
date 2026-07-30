import { redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

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

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(id)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .maybeSingle();
  const mySectionId = (enrollment?.sections as { id: string } | null)?.id ?? null;

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู (กันแก้ subject_id ใน URL)
  if (!mySectionId) redirect("/dashboard");

  const [{ data: student }, { data: subject }, { data: allTasks }, { data: submissions }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("tasks").select("*").eq("subject_id", subject_id).order("due_date"),
    supabase.from("task_submissions").select("*").eq("student_id", user.id),
  ]);

  const subMap = new Map(submissions?.map((s) => [s.task_id, s]) ?? []);

  // เรียง: ยังไม่ส่ง → ส่งแล้วรอตรวจ → ตรวจแล้ว / ในกลุ่มเดียวกันงานที่สั่งล่าสุดขึ้นก่อน
  const statusRank = (taskId: string) => {
    const sub = subMap.get(taskId);
    if (!sub) return 0; // ยังไม่ส่ง
    if (sub.grade == null) return 1; // รอตรวจ
    return 2; // ตรวจแล้ว
  };
  const tasks = (allTasks ?? [])
    .filter((t) => t.section_id == null || t.section_id === mySectionId)
    .sort(
      (a, b) =>
        statusRank(a.id) - statusRank(b.id) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const fileLinks = new Map<string, string>();
  for (const s of submissions ?? []) {
    if (s.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(s.file_url, 3600);
      if (data) fileLinks.set(s.task_id, data.signedUrl);
    }
  }

  const taskFileLinks = new Map<string, string>();
  for (const t of tasks) {
    if (t.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(t.file_url, 3600);
      if (data) taskFileLinks.set(t.id, data.signedUrl);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="tasks" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-bold text-ink">งานที่มอบหมาย</h1>

        {!tasks || tasks.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีงานที่มอบหมาย
          </div>
        ) : (
          tasks.map((task) => {
            const submission = subMap.get(task.id);
            const fileLink = fileLinks.get(task.id);
            const overdue = task.due_date ? new Date(task.due_date) < new Date() : false;
            const locked = overdue && !task.allow_late_submission;
            return (
              <div key={task.id} className="bg-white rounded-card border-[0.5px] border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-ink">{task.title}</h2>
                  {submission ? (
                    submission.grade != null ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-success-soft text-success-strong">
                        ตรวจแล้ว
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface text-ink-muted">
                        ส่งแล้ว · รอตรวจ
                      </span>
                    )
                  ) : task.due_date ? (
                    (() => {
                      const msLeft = new Date(task.due_date).getTime() - Date.now();
                      const daysLeft = Math.floor(msLeft / 86400000);
                      const label =
                        msLeft < 0 ? "เลยกำหนดแล้ว"
                        : daysLeft === 0 ? "ครบกำหนดวันนี้!"
                        : daysLeft === 1 ? "เหลืออีก 1 วัน"
                        : `เหลืออีก ${daysLeft} วัน`;
                      const urgent = msLeft < 0 || daysLeft <= 1;
                      return (
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            urgent ? "bg-danger-soft text-danger-strong" : "bg-surface text-ink-muted"
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })()
                  ) : null}
                </div>
                {task.file_name && (
                  <a
                    href={taskFileLinks.get(task.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:underline mb-2"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {task.file_name}
                  </a>
                )}
                {task.description && <p className="text-sm text-ink-muted mb-2">{task.description}</p>}
                {task.due_date && (
                  <p className={`text-xs mb-3 ${overdue ? "text-danger-strong" : "text-ink-faint"}`}>
                    กำหนดส่ง: {new Date(task.due_date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    {overdue && " (เลยกำหนด)"}
                  </p>
                )}

                {submission && submission.grade != null && (
                  <div className="bg-success-soft rounded-control px-3 py-2 mb-3">
                    <p className="text-sm font-semibold text-success-strong">
                      ครูตรวจแล้ว — ได้ {submission.grade} คะแนน
                    </p>
                    {submission.feedback && (
                      <p className="text-sm text-ink-muted mt-0.5">{submission.feedback}</p>
                    )}
                  </div>
                )}

                {submission && (
                  <div className="bg-surface rounded-control px-3 py-2 mb-3 text-sm">
                    {submission.file_name ? (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-navy-600 hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {submission.file_name}
                      </a>
                    ) : (
                      <p className="text-ink-muted whitespace-pre-wrap">{submission.content}</p>
                    )}
                  </div>
                )}

                {locked ? (
                  <p className="text-sm text-danger-strong bg-danger-soft rounded-control px-3 py-2">
                    หมดเขตส่งงานแล้ว ไม่สามารถส่ง{submission ? "หรือแก้ไข" : ""}งานนี้ได้อีก
                  </p>
                ) : (
                  <SubmitForm
                    taskId={task.id}
                    studentId={user.id}
                    existingContent={submission?.content ?? null}
                    existingFileName={submission?.file_name ?? null}
                  />
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
