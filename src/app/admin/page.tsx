import { redirect } from "next/navigation";
import Link from "next/link";
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
  const { data: me } = await supabase
    .from("teachers")
    .select("id, full_name, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!me || !me.is_super_admin) redirect("/teacher/dashboard");

  // จักพงเป็นแอดมินเดียวของทุกโรงเรียน — ต้องเห็นครูข้ามโรงเรียนได้ ผ่าน service role
  const svc = serviceClient();

  const { data: schools } = await svc.from("schools").select("id, name, school_code").order("name");
  const { data: teachers } = await svc.from("teachers").select("id, full_name, email, school_id, is_admin").order("full_name");
  const { data: teacherSubjects } = await svc.from("teacher_subjects").select("teacher_id");

  const countByTeacher: Record<string, number> = {};
  for (const ts of teacherSubjects ?? []) {
    countByTeacher[ts.teacher_id] = (countByTeacher[ts.teacher_id] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header name={me.full_name} role="teacher" homeHref="/admin" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-ink">จัดการครูทุกโรงเรียน</h1>
          <p className="text-sm text-ink-faint mt-0.5">{schools?.length ?? 0} โรงเรียน</p>
          <Link href="/platform" className="text-sm text-navy-600 hover:underline mt-2 inline-block">
            ไปหน้าคำขอเปิดใช้งานโรงเรียนใหม่ →
          </Link>
        </div>

        <div className="bg-white rounded-card border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-ink-muted mb-3">เชิญครูใหม่</h2>
          <InviteTeacherForm schools={schools ?? []} />
        </div>

        {(schools ?? []).map((school) => {
          const schoolTeachers = (teachers ?? []).filter((t) => t.school_id === school.id);
          return (
            <div key={school.id} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{school.name}</h2>
                <p className="text-xs text-ink-faint mt-0.5">รหัสโรงเรียน: {school.school_code}</p>
              </div>

              <div className="bg-white rounded-card border-[0.5px] border-border p-5">
                <h3 className="text-sm font-semibold text-ink-muted mb-3">ครูทั้งหมด ({schoolTeachers.length} คน)</h3>
                {schoolTeachers.length === 0 ? (
                  <p className="text-sm text-ink-faint">ยังไม่มีครูในโรงเรียนนี้</p>
                ) : (
                  <div className="space-y-2">
                    {schoolTeachers.map((t) => (
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
            </div>
          );
        })}
      </main>
    </div>
  );
}
