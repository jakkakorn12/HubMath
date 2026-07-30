import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
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

  const [{ data: student }, { data: subject }, { data: chapters }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("lesson_chapters").select("*").eq("subject_id", subject_id).order("order_index"),
  ]);

  const visibleChapters = (chapters ?? []).filter((c) => c.section_id == null || c.section_id === mySectionId);
  const chapterIds = visibleChapters.map((c) => c.id);

  const { data: lessons } = chapterIds.length
    ? await supabase.from("lessons").select("id, chapter_id, title, order_index").in("chapter_id", chapterIds).order("order_index")
    : { data: [] as { id: string; chapter_id: string; title: string; order_index: number }[] };

  const lessonsByChapter: Record<string, typeof lessons> = {};
  for (const l of lessons ?? []) {
    if (!lessonsByChapter[l.chapter_id]) lessonsByChapter[l.chapter_id] = [];
    lessonsByChapter[l.chapter_id]!.push(l);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="lessons" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">บทเรียน</h1>

        {visibleChapters.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีบทเรียนในวิชานี้
          </div>
        ) : (
          visibleChapters.map((c) => {
            const chapterLessons = lessonsByChapter[c.id] ?? [];
            return (
              <div key={c.id} className="bg-white rounded-card border-[0.5px] border-border p-5">
                <h2 className="text-sm font-semibold text-ink-muted mb-3">{c.title}</h2>
                {chapterLessons.length === 0 ? (
                  <p className="text-sm text-ink-faint">ยังไม่มีบทเรียนย่อย</p>
                ) : (
                  <div className="space-y-2">
                    {chapterLessons.map((l) => (
                      <Link
                        key={l.id}
                        href={`/lessons/${l.id}?subject_id=${subject_id}`}
                        className="flex items-center justify-between bg-white shadow-sm hover:shadow-md rounded-control px-4 py-3 transition-shadow"
                      >
                        <span className="text-sm text-ink">{l.title}</span>
                        <span className="text-xs text-navy-600 font-medium">เปิดดู →</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
