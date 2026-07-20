import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
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

  const [{ data: student }, { data: subject }, { data: resources }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", user.id).single(),
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("resources").select("*").eq("subject_id", subject_id)
      .order("created_at", { ascending: false }),
  ]);

  const visibleResources = (resources ?? []).filter((r) => r.section_id == null || r.section_id === mySectionId);

  // bucket เป็น private — sign URL อายุ 1 ชม.
  const signedUrls: Record<string, string> = {};
  const paths = visibleResources.map((r) => r.file_url).filter((p) => p && !p.startsWith("http"));
  if (paths.length) {
    // download: true → บังคับดาวน์โหลดเป็นไฟล์ แทนการเปิดดูในแท็บ
    const { data: signed } = await supabase.storage
      .from("resources")
      .createSignedUrls(paths, 3600, { download: true });
    for (const s of signed ?? []) {
      const match = visibleResources.find((r) => r.file_url === s.path);
      if (match && s.signedUrl) signedUrls[match.id] = s.signedUrl;
    }
  }

  const grouped: Record<string, typeof resources> = {};
  for (const r of visibleResources) {
    const key = r.category ?? "อื่นๆ";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(r);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={student?.full_name ?? user.email ?? ""} role="student" homeHref="/dashboard" />
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="resources" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-ink">คลังไฟล์เอกสาร</h1>

        {visibleResources.length === 0 ? (
          <div className="bg-white rounded-card border-[0.5px] border-border p-8 text-center text-ink-faint">
            ยังไม่มีไฟล์ในวิชานี้
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h2 className="text-sm font-semibold text-ink-muted mb-3">{category}</h2>
              <div className="space-y-2">
                {items!.map((r) => (
                  <a
                    key={r.id}
                    href={signedUrls[r.id] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-surface hover:bg-surface rounded-control px-4 py-3 transition-colors"
                  >
                    <span className="text-sm text-ink">{r.title}</span>
                    <span className="text-xs text-navy-600 font-medium">ดาวน์โหลด →</span>
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
