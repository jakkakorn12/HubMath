import Link from "next/link";

type TabKey = "scores" | "attendance" | "tasks" | "resources" | "media" | "lessons" | "interactive" | "quiz";

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
    { key: "scores", label: "คะแนน", href: `/grades?subject_id=${subjectId}` },
    { key: "tasks", label: "ส่งงาน", href: `/tasks?subject_id=${subjectId}` },
    { key: "resources", label: "เอกสาร", href: `/resources?subject_id=${subjectId}` },
    { key: "interactive", label: "ฝึกโต้ตอบ", href: `/interactive?subject_id=${subjectId}` },
    { key: "quiz", label: "แบบทดสอบ", href: `/quiz?subject_id=${subjectId}` },
    { key: "lessons", label: "บทเรียน", href: `/lessons?subject_id=${subjectId}` },
    { key: "media", label: "สื่อการเรียนรู้", href: `/media?subject_id=${subjectId}` },
    { key: "attendance", label: "เวลาเรียน", href: `/attendance?subject_id=${subjectId}` },
  ];

  return (
    <nav className="bg-white border-b-[0.5px] border-border sticky top-14 z-40">
      <div className="max-w-6xl mx-auto px-4 pt-3 flex items-baseline gap-2.5">
        <Link href="/dashboard" className="text-navy-600 hover:underline text-sm shrink-0">← กลับ</Link>
        <span className="text-border">|</span>
        <span className="font-medium text-ink truncate">
          {subjectName}
          {subjectType && (
            <span className="text-ink-faint font-normal text-xs ml-1.5">
              {subjectTypeLabel[subjectType] ?? subjectType}
            </span>
          )}
        </span>
      </div>
      <div className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto mt-3">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`pb-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab.key === active
                ? "border-navy-900 text-navy-900 font-medium"
                : "border-transparent text-ink-faint hover:text-ink-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
