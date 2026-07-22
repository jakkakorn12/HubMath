import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import InviteTeacherForm from "./InviteTeacherForm";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");

  // เช็คสิทธิ์ผ่าน session ปกติก่อน (RLS "teachers see own profile" อนุญาตแค่แถวตัวเอง — พอสำหรับเช็คสิทธิ์)
  const { data: admin } = await supabase
    .from("teachers")
    .select("id, full_name, school_id, is_admin")
    .eq("id", user.id)
    .single();
  if (!admin || !admin.is_admin) redirect("/teacher/dashboard");

  // ดึงรายชื่อครูคนอื่นในโรงเรียนต้องผ่าน service role
  // (RLS ปกติให้ครูเห็นแค่แถวตัวเอง — แอดมินต้องเห็นข้ามครูได้ ไม่งั้นเห็นแค่ตัวเองเสมอ)
  const svc = serviceClient();

  const { data: school } = admin.school_id
    ? await svc.from("schools").select("id, name").eq("id", admin.school_id).single()
    : { data: null };

  const { data: teachers } = await svc
    .from("teachers")
    .select("id, full_name, email, is_admin")
    .eq("school_id", admin.school_id ?? "")
    .order("full_name");

  // นับวิชาต่อครูจาก teacher_subjects (กลไกจริงที่ RLS ใช้ตัดสิน ไม่ใช่ subjects.teacher_id ที่เพิ่งเพิ่ม)
  const { data: teacherSubjects } = await svc.from("teacher_subjects").select("teacher_id");
  const countByTeacher: Record<string, number> = {};
  for (const ts of teacherSubjects ?? []) {
    countByTeacher[ts.teacher_id] = (countByTeacher[ts.teacher_id] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={admin.full_name} role="teacher" homeHref="/admin" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-ink">จัดการครู</h1>
          <p className="text-sm text-ink-faint mt-0.5">{school?.name ?? "โรงเรียน"}</p>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">เชิญครูใหม่เข้าโรงเรียนนี้</h2>
          <InviteTeacherForm />
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">ครูทั้งหมด ({teachers?.length ?? 0} คน)</h2>
          {!teachers || teachers.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีครูในโรงเรียนนี้</p>
          ) : (
            <div className="space-y-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3">
                  <div>
                    <p className="text-sm text-ink font-medium">
                      {t.full_name}
                      {t.is_admin && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-navy-100 text-navy-900">
                          แอดมิน
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">{t.email}</p>
                  </div>
                  <p className="text-xs text-ink-faint shrink-0">{countByTeacher[t.id] ?? 0} วิชา</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
