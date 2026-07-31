import Link from "next/link";

type TabKey = "students" | "scores" | "files" | "media" | "lessons" | "interactive" | "quiz" | "tasks" | "attendance" | "announcements";

export default function TeacherNav({
  sectionId,
  subjectId,
  subjectName,
  roomName,
  active,
}: {
  sectionId: string;
  subjectId: string;
  subjectName?: string;
  roomName?: string;
  active: TabKey;
}) {
  const tabs: { key: TabKey; label: string; href: string }[] = [
    { key: "scores", label: "คะแนน", href: `/teacher/gradebook?section_id=${sectionId}` },
    { key: "attendance", label: "เช็คชื่อ", href: `/teacher/attendance?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "tasks", label: "มอบหมายงาน", href: `/teacher/tasks?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "files", label: "จัดการไฟล์", href: `/teacher/resources?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "lessons", label: "บทเรียน", href: `/teacher/lessons?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "media", label: "สื่อการเรียนรู้", href: `/teacher/media?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "interactive", label: "ฝึกโต้ตอบ", href: `/teacher/interactive?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "quiz", label: "แบบทดสอบ", href: `/teacher/quizzes?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "students", label: "รายชื่อนักเรียน", href: `/teacher/students?section_id=${sectionId}` },
    { key: "announcements", label: "ประกาศ", href: `/teacher/announcements?subject_id=${subjectId}&section_id=${sectionId}` },
  ];

  return (
    <nav className="bg-white border-b-[0.5px] border-border sticky top-14 z-40">
      <div className="max-w-7xl mx-auto px-4 pt-3 flex items-baseline gap-2.5">
        <Link href="/teacher/dashboard" className="text-navy-600 hover:underline text-sm shrink-0">← หน้าหลัก</Link>
        <span className="text-border">|</span>
        <span className="font-medium text-ink truncate">
          {subjectName}
          {roomName && <span className="text-ink-faint font-normal text-xs ml-1.5">ห้อง {roomName}</span>}
        </span>
      </div>
      <div className="max-w-7xl mx-auto px-4 flex gap-5 overflow-x-auto mt-3">
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
