import Link from "next/link";

type TabKey = "files" | "tasks" | "attendance" | "announcements";

function buildQuery(subjectId?: string, sectionId?: string) {
  const params = new URLSearchParams();
  if (subjectId) params.set("subject_id", subjectId);
  if (sectionId) params.set("section_id", sectionId);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export default function TeacherContentNav({
  subjectId,
  sectionId,
  active,
}: {
  subjectId?: string;
  sectionId?: string;
  active: TabKey;
}) {
  const q = buildQuery(subjectId, sectionId);
  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: "files", label: "จัดการไฟล์", href: `/teacher/resources${q}` },
    { key: "tasks", label: "มอบหมายงาน", href: `/teacher/tasks${q}` },
    { key: "attendance", label: "เช็คชื่อ", href: `/teacher/attendance${q}` },
    { key: "announcements", label: "ประกาศ", href: `/teacher/announcements${q}` },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-4 pt-3 flex items-center gap-3">
        <Link href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm shrink-0">← หน้าหลัก</Link>
        <h1 className="text-lg font-bold text-gray-800">HubMath — ครู</h1>
        <form action="/auth/signout" method="POST" className="ml-auto shrink-0">
          <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
        </form>
      </div>
      <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab.key === active
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
