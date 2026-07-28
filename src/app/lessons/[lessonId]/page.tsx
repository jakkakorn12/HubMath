import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
function isImageFile(fileName: string | null) {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const { lessonId } = await params;
  const { subject_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, lesson_chapters(id, title, subject_id)")
    .eq("id", lessonId)
    .single();
  if (!lesson) redirect("/dashboard");

  const chapter = lesson.lesson_chapters as { id: string; title: string; subject_id: string } | null;
  const subjectId = subject_id ?? chapter?.subject_id;
  if (!subjectId) redirect("/dashboard");

  const { data: enrollment } = await supabase
    .from("student_sections")
    .select("sections!inner(id)")
    .eq("student_id", user.id)
    .eq("sections.subject_id", subjectId)
    .limit(1)
    .maybeSingle();
  const mySectionId = (enrollment?.sections as { id: string } | null)?.id ?? null;

  // ไม่ได้ลงทะเบียนวิชานี้ → ห้ามดู
  if (!mySectionId) redirect("/dashboard");

  const [{ data: student }, { data: subject }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subjectId).single(),
  ]);

  let signedFileUrl: string | null = null;
  if (lesson.media_type === "file" && lesson.file_url) {
    const { data } = await supabase.storage.from("resources").createSignedUrl(lesson.file_url, 3600);
    signedFileUrl = data?.signedUrl ?? null;
  }

  // บทเรียนย่อยก่อนหน้า/ถัดไป ในบทเดียวกัน เรียงตามลำดับ
  const { data: siblingLessons } = chapter
    ? await supabase.from("lessons").select("id, title, order_index").eq("chapter_id", chapter.id).order("order_index")
    : { data: [] as { id: string; title: string; order_index: number }[] };
  const idx = (siblingLessons ?? []).findIndex((l) => l.id === lessonId);
  const prevLesson = idx > 0 ? siblingLessons![idx - 1] : null;
  const nextLesson = idx >= 0 && idx < (siblingLessons?.length ?? 0) - 1 ? siblingLessons![idx + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subjectId} subjectName={subject?.name} subjectType={subject?.type} active="lessons" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link href={`/lessons?subject_id=${subjectId}`} className="text-navy-600 hover:underline text-sm">
          ← กลับไปหน้าบทเรียน
        </Link>

        <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-4">
          {chapter && <p className="text-xs text-ink-faint">{chapter.title}</p>}
          <h1 className="text-xl font-bold text-ink">{lesson.title}</h1>

          {lesson.content && (
            <p className="text-sm text-ink-muted whitespace-pre-wrap">{lesson.content}</p>
          )}

          {lesson.media_type === "file" && signedFileUrl && (
            isImageFile(lesson.file_name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signedFileUrl} alt={lesson.title} className="w-full rounded-control border-[0.5px] border-border" />
            ) : (
              <a
                href={signedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-navy-600 border-[0.5px] border-border rounded-control px-4 py-2 hover:bg-surface"
              >
                เปิดไฟล์แนบ →
              </a>
            )
          )}

          {lesson.media_type === "link" && lesson.media_url && (
            <a
              href={lesson.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-navy-600 border-[0.5px] border-border rounded-control px-4 py-2 hover:bg-surface"
            >
              เปิดดูวิดีโอ/ลิงก์ →
            </a>
          )}
        </div>

        {(prevLesson || nextLesson) && (
          <div className="flex items-center justify-between">
            {prevLesson ? (
              <Link href={`/lessons/${prevLesson.id}?subject_id=${subjectId}`} className="text-sm text-navy-600 hover:underline">
                ← {prevLesson.title}
              </Link>
            ) : <span />}
            {nextLesson ? (
              <Link href={`/lessons/${nextLesson.id}?subject_id=${subjectId}`} className="text-sm text-navy-600 hover:underline">
                {nextLesson.title} →
              </Link>
            ) : <span />}
          </div>
        )}
      </main>
    </div>
  );
}
