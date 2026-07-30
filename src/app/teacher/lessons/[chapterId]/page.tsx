import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Header from "@/components/Header";
import LessonManager from "./LessonManager";

export const dynamic = "force-dynamic";

export default async function ChapterLessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { chapterId } = await params;
  const { section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const { data: chapter } = await supabase.from("lesson_chapters").select("*, subjects(name, id)").eq("id", chapterId).single();
  if (!chapter) redirect("/teacher/lessons");

  const subject = chapter.subjects as { name: string; id: string } | null;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index");

  const signedUrls: Record<string, string> = {};
  const filePaths = (lessons ?? []).filter((l) => l.media_type === "file" && l.file_url).map((l) => l.file_url as string);
  if (filePaths.length) {
    const { data: signed } = await supabase.storage.from("resources").createSignedUrls(filePaths, 3600);
    for (const s of signed ?? []) {
      const match = (lessons ?? []).find((l) => l.file_url === s.path);
      if (match && s.signedUrl) signedUrls[match.id] = s.signedUrl;
    }
  }

  const backQuery = `?subject_id=${subject?.id}${section_id ? `&section_id=${section_id}` : ""}`;

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      <nav className="bg-white border-b-[0.5px] border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <Link href={`/teacher/lessons${backQuery}`} className="text-navy-600 hover:underline text-sm shrink-0">
            ← กลับ
          </Link>
          <span className="text-border">|</span>
          <span className="font-medium text-ink truncate">{chapter.title}</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <LessonManager
          chapterId={chapter.id}
          subjectId={chapter.subject_id}
          lessons={lessons ?? []}
          signedUrls={signedUrls}
        />
      </main>
    </div>
  );
}
