import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherContentNav from "@/components/TeacherContentNav";
import TeacherNav from "@/components/TeacherNav";
import Header from "@/components/Header";
import SubjectRoomPicker from "@/components/SubjectRoomPicker";
import MediaManager from "./MediaManager";

export const dynamic = "force-dynamic";

export default async function TeacherMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string; section_id?: string }>;
}) {
  const { subject_id, section_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { data: teacher } = await supabase.from("teachers").select("id, full_name").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    supabase.from("subjects").select("id, name, type").order("code"),
    supabase.from("sections").select("id, name, subject_id").order("name"),
  ]);

  const roomNameById: Record<string, string> = {};
  for (const s of sections ?? []) roomNameById[s.id] = s.name;

  const typeLabel: Record<string, string> = { basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก" };
  const typeLabelBySubject: Record<string, string> = {};
  for (const s of subjects ?? []) typeLabelBySubject[s.id] = typeLabel[s.type] ?? s.type;

  let query = supabase.from("learning_media").select("*").order("created_at", { ascending: false });
  if (subject_id) {
    query = query.eq("subject_id", subject_id);
    if (section_id) query = query.or(`section_id.is.null,section_id.eq.${section_id}`);
  }
  const { data: media } = await query;

  // bucket เป็น private — sign URL อายุ 1 ชม. (เฉพาะรายการที่เป็นไฟล์ ลิงก์ใช้ url ตรงๆ)
  const signedUrls: Record<string, string> = {};
  const filePaths = (media ?? []).filter((m) => m.media_type === "file" && m.file_url).map((m) => m.file_url as string);
  if (filePaths.length) {
    const { data: signed } = await supabase.storage.from("resources").createSignedUrls(filePaths, 3600);
    for (const s of signed ?? []) {
      const match = (media ?? []).find((m) => m.file_url === s.path);
      if (match && s.signedUrl) signedUrls[match.id] = s.signedUrl;
    }
  }

  const subjectName = (subjects ?? []).find((s) => s.id === subject_id)?.name;
  const roomName = section_id ? roomNameById[section_id] : undefined;
  const targetLabel = !subject_id ? "" : section_id ? `ห้อง ${roomName}` : `ทุกห้องในวิชา ${subjectName}`;

  const inRoomShell = !!(section_id && subject_id);

  return (
    <div className="min-h-screen bg-white">
      <Header name={teacher.full_name} role="teacher" homeHref="/teacher/dashboard" wide />
      {inRoomShell ? (
        <TeacherNav
          sectionId={section_id!}
          subjectId={subject_id!}
          subjectName={subjectName}
          roomName={roomName}
          active="media"
        />
      ) : (
        <TeacherContentNav subjectId={subject_id} sectionId={section_id} active="media" />
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!inRoomShell && (
          <SubjectRoomPicker
            subjects={subjects ?? []}
            sections={sections ?? []}
            subjectId={subject_id}
            sectionId={section_id}
          />
        )}
        <MediaManager
          subjectId={subject_id ?? null}
          sectionId={section_id ?? null}
          targetLabel={targetLabel}
          media={media ?? []}
          roomNameById={roomNameById}
          typeLabelBySubject={typeLabelBySubject}
          signedUrls={signedUrls}
        />
      </main>
    </div>
  );
}
