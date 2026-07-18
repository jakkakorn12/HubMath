import Link from "next/link";

type TabKey = "students" | "scores" | "files" | "tasks" | "attendance";

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
    { key: "students", label: "รายชื่อนักเรียน", href: `/teacher/students?section_id=${sectionId}` },
    { key: "files", label: "จัดการไฟล์", href: `/teacher/resources?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "tasks", label: "มอบหมายงาน", href: `/teacher/tasks?subject_id=${subjectId}&section_id=${sectionId}` },
    { key: "attendance", label: "เช็คชื่อ", href: `/teacher/attendance?subject_id=${subjectId}&section_id=${sectionId}` },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-4 pt-3 flex items-center gap-3">
        <Link href="/teacher/dashboard" className="text-blue-600 hover:underline text-sm shrink-0">← กลับหน้าหลัก</Link>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-800 truncate">
          {subjectName}
          {roomName && <span className="text-gray-400 font-normal text-sm ml-1">· ห้อง {roomName}</span>}
        </span>
        <form action="/auth/signout" method="POST" className="ml-auto shrink-0">
          <button className="text-sm text-red-500 hover:underline">ออกจากระบบ</button>
        </form>
      </div>
      <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
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
