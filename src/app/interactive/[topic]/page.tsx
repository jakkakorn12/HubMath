import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";
import { getTopic } from "@/components/interactive/topics/registry";
import InteractiveUnit from "./InteractiveUnit";

export const dynamic = "force-dynamic";

export default async function InteractiveTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { topic } = await params;
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!subject_id) redirect("/dashboard");

  const def = getTopic(topic);
  if (!def) redirect(`/interactive?subject_id=${subject_id}`);

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(id)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subject_id)
    .limit(1)
    .maybeSingle();
  const mySectionId = (enrollment?.sections as { id: string } | null)?.id ?? null;

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู (กันแก้ URL ตรง)
  if (!mySectionId) redirect("/dashboard");

  const { data: enabledRows } = await supabase
    .from("interactive_topics")
    .select("section_id")
    .eq("subject_id", subject_id)
    .eq("topic_slug", topic);
  const isEnabled = (enabledRows ?? []).some((r) => r.section_id == null || r.section_id === mySectionId);
  if (!isEnabled) redirect(`/interactive?subject_id=${subject_id}`);

  const [{ data: student }, { data: subject }, { data: progress }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase
      .from("interactive_progress")
      .select("*")
      .eq("student_id", user.id)
      .eq("topic_slug", topic)
      .maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="interactive" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href={`/interactive?subject_id=${subject_id}`} className="text-navy-600 hover:underline text-sm">
          ← กลับไปหน้าฝึกโต้ตอบ
        </Link>

        <InteractiveUnit
          topicSlug={topic}
          initialSeen={progress?.seen ?? 0}
          initialAsked={progress?.asked ?? 0}
          initialCorrect={progress?.correct ?? 0}
        />
      </main>
    </div>
  );
}
