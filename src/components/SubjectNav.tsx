import Link from "next/link";

type TabKey = "scores" | "attendance" | "tasks" | "resources";

const subjectTypeLabel: Record<string, string> = {
  basic: "พื้นฐาน", advanced: "เพิ่มเติม", elective: "เลือก",
};

export default function SubjectNav({
  subjectId,
  subjectName,
  subjectType,
  active,
}: {
  subjectId: string;
  subjectName?: string;
  subjectType?: string;
  active: TabKey;
}) {
  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: "scores", label: "คะแนน", href: `/assignments?subject_id=${subjectId}` },
    { key: "attendance", label: "เวลาเรียน", href: `/attendance?subject_id=${subjectId}` },
    { key: "tasks", label: "ส่งงาน", href: `/tasks?subject_id=${subjectId}` },
    { key: "resources", label: "เอกสาร", href: `/resources?subject_id=${subjectId}` },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-3xl mx-auto px-4 pt-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm shrink-0">← กลับหน้าหลัก</Link>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-800 truncate">
          {subjectName}
          {subjectType && (
            <span className="text-gray-400 font-normal text-sm ml-1">
              ({subjectTypeLabel[subjectType] ?? subjectType})
            </span>
          )}
        </span>
      </div>
      <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
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
