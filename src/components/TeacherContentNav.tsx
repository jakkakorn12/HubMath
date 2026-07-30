import Link from "next/link";

type TabKey = "files" | "media" | "lessons" | "interactive" | "tasks" | "attendance" | "announcements";

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
    { key: "media", label: "สื่อการเรียนรู้", href: `/teacher/media${q}` },
    { key: "lessons", label: "บทเรียน", href: `/teacher/lessons${q}` },
    { key: "interactive", label: "ฝึกโต้ตอบ", href: `/teacher/interactive${q}` },
    { key: "tasks", label: "มอบหมายงาน", href: `/teacher/tasks${q}` },
    { key: "attendance", label: "เช็คชื่อ", href: `/teacher/attendance${q}` },
    { key: "announcements", label: "ประกาศ", href: `/teacher/announcements${q}` },
  ];

  return (
    <nav className="bg-white border-b-[0.5px] border-border">
      <div className="max-w-5xl mx-auto px-4 flex gap-5 overflow-x-auto pt-3">
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
