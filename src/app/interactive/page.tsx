import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";
import { TOPIC_REGISTRY } from "@/components/interactive/topics/registry";

export const dynamic = "force-dynamic";

export default async function InteractivePage({
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

  const [{ data: student }, { data: subject }, { data: topics }, { data: progress }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("interactive_topics").select("*").eq("subject_id", subject_id).order("order_index"),
    supabase.from("interactive_progress").select("*").eq("student_id", user.id),
  ]);

  const visibleTopics = (topics ?? []).filter((t) => t.section_id == null || t.section_id === mySectionId);
  const progressBySlug: Record<string, { seen: number; asked: number; correct: number }> = {};
  for (const p of progress ?? []) progressBySlug[p.topic_slug] = p;

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="interactive" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">ฝึกโต้ตอบ</h1>

        {visibleTopics.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีหน่วยฝึกโต้ตอบในวิชานี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleTopics.map((t) => {
              const def = TOPIC_REGISTRY[t.topic_slug];
              if (!def) return null;
              const p = progressBySlug[t.topic_slug];
              return (
                <Link
                  key={t.id}
                  href={`/interactive/${t.topic_slug}?subject_id=${subject_id}`}
                  className="bg-white shadow-sm hover:shadow-md rounded-card border-[0.5px] border-border p-5 transition-shadow block"
                >
                  <h2 className="font-bold text-ink mb-1">{def.name}</h2>
                  <p className="text-xs text-ink-faint mb-3">{def.subtitle}</p>
                  <p className="text-xs text-navy-600 font-medium">
                    {p ? `ดูแล้ว ${p.seen} ขั้น · ตอบ ${p.asked} ข้อ` : "ยังไม่เริ่ม"} · เปิดดู →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
