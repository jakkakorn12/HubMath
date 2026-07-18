import { redirect } from "next/navigation";
import { AlertTriangle, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { textSimilarity, SIMILARITY_THRESHOLD } from "@/lib/similarity";
import GradeForm from "./GradeForm";

export const dynamic = "force-dynamic";

export default async function TaskSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ section_id?: string; room?: string }>;
}) {
  const { taskId } = await params;
  const { section_id, room } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  const { data: teacher } = await supabase.from("teachers").select("*").eq("id", user.id).single();
  if (!teacher) redirect("/teacher/login");

  const { data: task } = await supabase.from("tasks").select("*, subjects(name, id)").eq("id", taskId).single();
  if (!task) redirect("/teacher/dashboard");

  const subject = task.subjects as { name: string; id: string } | null;

  const { data: submissions } = await supabase
    .from("task_submissions")
    .select("*, students(full_name, student_code)")
    .eq("task_id", taskId);

  // ── ห้องเป้าหมายของงานนี้ ──
  const { data: subjectSections } = await supabase
    .from("sections")
    .select("id, name")
    .eq("subject_id", task.subject_id)
    .order("name");
  const targetSections = (subjectSections ?? []).filter(
    (s) => task.section_id == null || s.id === task.section_id
  );
  const targetSectionIds = targetSections.map((s) => s.id);

  const { data: rosterEnroll } = targetSectionIds.length
    ? await supabase
        .from("roster_enrollments")
        .select("student_code, student_number, section_id")
        .in("section_id", targetSectionIds)
    : { data: [] as { student_code: string; student_number: number | null; section_id: string }[] };

  const rosterCodes = [...new Set((rosterEnroll ?? []).map((r) => r.student_code))];
  const { data: rosterNames } = rosterCodes.length
    ? await supabase.from("student_roster").select("student_code, full_name").in("student_code", rosterCodes)
    : { data: [] as { student_code: string; full_name: string }[] };
  const nameByCode = new Map((rosterNames ?? []).map((r) => [r.student_code, r.full_name]));

  // code → {ห้อง, เลขที่} (ถ้าอยู่หลายห้องในวิชา ใช้แถวแรก)
  const metaByCode = new Map<string, { sectionId: string; number: number }>();
  for (const r of rosterEnroll ?? []) {
    if (!metaByCode.has(r.student_code)) {
      metaByCode.set(r.student_code, { sectionId: r.section_id, number: r.student_number ?? 0 });
    }
  }

  const submittedCodes = new Set(
    (submissions ?? [])
      .map((s) => (s.students as { student_code: string } | null)?.student_code)
      .filter(Boolean) as string[]
  );

  // ── ห้องที่กำลังดู: ?room=... > ห้องที่เข้ามา > ทุกห้อง ──
  const activeRoom =
    room && (room === "all" || targetSectionIds.includes(room))
      ? room
      : section_id && targetSectionIds.includes(section_id)
        ? section_id
        : "all";

  const roomNameById = new Map(targetSections.map((s) => [s.id, s.name]));

  // สรุปต่อห้อง (โชว์บน pill)
  const statsBySection = targetSections.map((s) => {
    const codes = (rosterEnroll ?? []).filter((r) => r.section_id === s.id).map((r) => r.student_code);
    const submitted = codes.filter((c) => submittedCodes.has(c)).length;
    return { id: s.id, name: s.name, submitted, total: codes.length };
  });
  const allSubmitted = statsBySection.reduce((s, x) => s + x.submitted, 0);
  const allTotal = statsBySection.reduce((s, x) => s + x.total, 0);

  // ── งานที่ส่ง: กรองตามห้อง + เรียงตามเลขที่ ──
  type Submission = NonNullable<typeof submissions>[number];
  const visibleSubs: { sub: Submission; code: string; number: number; roomName: string }[] =
    (submissions ?? [])
      .map((sub) => {
        const code = (sub.students as { student_code: string } | null)?.student_code ?? "";
        const meta = metaByCode.get(code);
        return {
          sub,
          code,
          number: meta?.number ?? 0,
          roomName: meta ? (roomNameById.get(meta.sectionId) ?? "?") : "?",
          sectionId: meta?.sectionId ?? "",
        };
      })
      .filter((x) => activeRoom === "all" || x.sectionId === activeRoom)
      .sort((a, b) => a.roomName.localeCompare(b.roomName, "th", { numeric: true }) || a.number - b.number);

  // ── ตรวจคัดลอก: ไฟล์เทียบ hash (เหมือนเป๊ะ) + ข้อความเทียบความคล้าย ≥80% ──
  // เทียบข้ามทุกห้อง (ก็อปข้ามห้องก็จับได้) พร้อมบอกว่าคล้ายกับใคร กี่ %
  const subsAll = submissions ?? [];
  const matchesById = new Map<string, { name: string; percent: number }[]>();
  const addMatch = (id: string, name: string, percent: number) => {
    if (!matchesById.has(id)) matchesById.set(id, []);
    matchesById.get(id)!.push({ name, percent });
  };
  for (let i = 0; i < subsAll.length; i++) {
    for (let j = i + 1; j < subsAll.length; j++) {
      const a = subsAll[i];
      const b = subsAll[j];
      let percent = 0;
      if (a.content_hash && a.content_hash === b.content_hash) {
        percent = 100;
      } else if (a.content && b.content) {
        const sim = textSimilarity(a.content, b.content);
        if (sim >= SIMILARITY_THRESHOLD) percent = Math.round(sim * 100);
      }
      if (percent > 0) {
        const nameA = (a.students as { full_name: string } | null)?.full_name ?? "?";
        const nameB = (b.students as { full_name: string } | null)?.full_name ?? "?";
        addMatch(a.id, nameB, percent);
        addMatch(b.id, nameA, percent);
      }
    }
  }
  for (const list of matchesById.values()) list.sort((x, y) => y.percent - x.percent);

  const fileLinks = new Map<string, string>();
  for (const { sub } of visibleSubs) {
    if (sub.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(sub.file_url, 3600);
      if (data) fileLinks.set(sub.id, data.signedUrl);
    }
  }

  // ── ยังไม่ส่ง: กรองตามห้อง + เรียงตามเลขที่ ──
  const missing = (rosterEnroll ?? [])
    .filter((r) => !submittedCodes.has(r.student_code))
    .filter((r) => activeRoom === "all" || r.section_id === activeRoom)
    .map((r) => ({
      code: r.student_code,
      number: r.student_number ?? 0,
      name: nameByCode.get(r.student_code) ?? "—",
      room: roomNameById.get(r.section_id) ?? "?",
    }))
    .sort((a, b) => a.room.localeCompare(b.room, "th", { numeric: true }) || a.number - b.number);

  const backQuery = `?subject_id=${subject?.id}${section_id ? `&section_id=${section_id}` : ""}`;
  const pillQuery = (roomId: string) =>
    `?${section_id ? `section_id=${section_id}&` : ""}room=${roomId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/teacher/tasks${backQuery}`} className="text-blue-600 hover:underline text-sm">
            ← กลับ
          </Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800 truncate">{task.title}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* เลือกห้อง */}
        <div className="flex flex-wrap gap-2">
          {targetSections.length > 1 && (
            <Link
              href={pillQuery("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeRoom === "all"
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              ทุกห้อง ({allSubmitted}/{allTotal})
            </Link>
          )}
          {statsBySection.map((s) => (
            <Link
              key={s.id}
              href={pillQuery(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeRoom === s.id
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              ห้อง {s.name} ({s.submitted}/{s.total})
            </Link>
          ))}
        </div>

        {/* ส่งแล้ว */}
        <h2 className="text-lg font-bold text-gray-800">
          ส่งแล้ว <span className="text-gray-400 font-normal">({visibleSubs.length} คน)</span>
        </h2>

        {visibleSubs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            ยังไม่มีนักเรียนส่งงาน{activeRoom !== "all" ? "ในห้องนี้" : ""}
          </div>
        ) : (
          visibleSubs.map(({ sub, number, roomName }) => {
            const student = sub.students as { full_name: string; student_code: string } | null;
            const matches = matchesById.get(sub.id) ?? [];
            const fileLink = fileLinks.get(sub.id);
            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl shadow-sm border p-5 ${matches.length > 0 ? "border-red-300" : "border-gray-100"}`}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap tabular-nums pt-1">
                      ห้อง {roomName} · {number || "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{student?.full_name}</p>
                      <p className="text-xs text-gray-400">{student?.student_code}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {matches.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        คล้ายกับ {matches[0].name} ({matches[0].percent}%)
                        {matches.length > 1 && ` +${matches.length - 1}`}
                      </span>
                    )}
                    {sub.grade != null && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                        ตรวจแล้ว · {sub.grade} คะแนน
                      </span>
                    )}
                  </div>
                </div>
                {sub.file_name ? (
                  <a
                    href={fileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {sub.file_name}
                  </a>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                    {sub.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  ส่งเมื่อ {new Date(sub.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <GradeForm
                  submissionId={sub.id}
                  initialGrade={sub.grade}
                  initialFeedback={sub.feedback}
                />
              </div>
            );
          })
        )}

        {/* ยังไม่ส่ง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            ยังไม่ส่ง <span className="text-gray-400 font-normal">({missing.length} คน)</span>
          </h2>
          {missing.length === 0 ? (
            <p className="text-sm text-green-700">ส่งครบทุกคนแล้ว</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {missing.map((m) => (
                <div key={`${m.room}-${m.code}`} className="flex items-center gap-2 text-sm">
                  <span className={`text-gray-400 shrink-0 whitespace-nowrap tabular-nums ${activeRoom === "all" ? "w-24" : "w-8 text-right"}`}>
                    {activeRoom === "all" ? `ห้อง ${m.room} · ` : ""}{m.number || "—"}
                  </span>
                  <span className="text-gray-700 truncate">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
