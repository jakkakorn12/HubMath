import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function MediaPage({
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

  const [{ data: student }, { data: subject }, { data: media }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("learning_media").select("*").eq("subject_id", subject_id)
      .order("created_at", { ascending: false }),
  ]);

  const visibleMedia = (media ?? []).filter((m) => m.section_id == null || m.section_id === mySectionId);

  // bucket เป็น private — sign URL อายุ 1 ชม. (เฉพาะรายการที่เป็นไฟล์ เปิดดูในแท็บใหม่ ไม่บังคับดาวน์โหลด)
  const signedUrls: Record<string, string> = {};
  const filePaths = visibleMedia.filter((m) => m.media_type === "file" && m.file_url).map((m) => m.file_url as string);
  if (filePaths.length) {
    const { data: signed } = await supabase.storage.from("resources").createSignedUrls(filePaths, 3600);
    for (const s of signed ?? []) {
      const match = visibleMedia.find((m) => m.file_url === s.path);
      if (match && s.signedUrl) signedUrls[match.id] = s.signedUrl;
    }
  }

  const grouped: Record<string, typeof visibleMedia> = {};
  for (const m of visibleMedia) {
    const key = m.category ?? "อื่นๆ";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(m);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="media" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">สื่อการเรียนรู้</h1>

        {visibleMedia.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีสื่อการเรียนรู้ในวิชานี้
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h2 className="text-sm font-semibold text-ink-muted mb-3">{category}</h2>
              <div className="space-y-2">
                {items!.map((m) => (
                  <a
                    key={m.id}
                    href={m.media_type === "link" ? m.url ?? "#" : signedUrls[m.id] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-white shadow-sm hover:shadow-md rounded-control px-4 py-3 transition-shadow"
                  >
                    <div>
                      <span className="text-sm text-ink block">{m.title}</span>
                      {m.description && <span className="text-xs text-ink-faint block mt-0.5">{m.description}</span>}
                    </div>
                    <span className="text-xs text-navy-600 font-medium shrink-0 ml-3">เปิดดู →</span>
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
