import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectNav from "@/components/SubjectNav";

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

  const [{ data: subject }, { data: resources }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subject_id).single(),
    supabase.from("resources").select("*").eq("subject_id", subject_id)
      .order("term").order("created_at", { ascending: false }),
  ]);

  const grouped: Record<string, typeof resources> = {};
  for (const r of resources ?? []) {
    const key = r.category ?? "อื่นๆ";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(r);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SubjectNav subjectId={subject_id} subjectName={subject?.name} subjectType={subject?.type} active="resources" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-gray-800">คลังไฟล์เอกสาร</h1>

        {!resources || resources.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            ยังไม่มีไฟล์ในวิชานี้
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">{category}</h2>
              <div className="space-y-2">
                {items!.map((r) => (
                  <a
                    key={r.id}
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{r.title}</span>
                    <span className="text-xs text-blue-600 font-medium">ดาวน์โหลด →</span>
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
