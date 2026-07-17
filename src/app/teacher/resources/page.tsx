import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import ResourceManager from "./ResourceManager";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("code"),
    supabase.from("sections").select("id, name, subject_id").order("name"),
  ]);

  const roomNameById: Record<string, string> = {};
  for (const s of sections ?? []) roomNameById[s.id] = s.name;

  // ดึงไฟล์ตามที่เลือก
  let query = supabase.from("resources").select("*").order("created_at", { ascending: false });
  if (subject_id) {
    query = query.eq("subject_id", subject_id);
    if (section_id) query = query.or(`section_id.is.null,section_id.eq.${section_id}`);
  }
  const { data: resources } = await query;

  // bucket เป็น private — sign URL อายุ 1 ชม.
  const signedUrls: Record<string, string> = {};
  const paths = (resources ?? []).map((r) => r.file_url).filter((p) => p && !p.startsWith("http"));
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("resources").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      const match = (resources ?? []).find((r) => r.file_url === s.path);
      if (match && s.signedUrl) signedUrls[match.id] = s.signedUrl;
    }
  }

  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = section_id ? roomNameById[section_id] : undefined;
  const targetLabel = !subject_id ? "" : section_id ? `ห้อง ${roomName}` : `ทุกห้องในวิชา ${subjectName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="files" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <SubjectRoomPicker
          subjects={subjects ?? []}
          sections={sections ?? []}
          subjectId={subject_id}
          sectionId={section_id}
        />
        <ResourceManager
          subjectId={subject_id ?? null}
          sectionId={section_id ?? null}
          targetLabel={targetLabel}
          resources={resources ?? []}
          roomNameById={roomNameById}
          signedUrls={signedUrls}
        />
      </main>
    </div>
  );
}
