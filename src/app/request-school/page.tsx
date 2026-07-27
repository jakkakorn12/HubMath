import Link from "next/link";
import RequestSchoolForm from "./RequestSchoolForm";

export const dynamic = "force-static";

export default function RequestSchoolPage() {
  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="max-w-sm mx-auto">
        <Link href="/teacher/login" className="text-navy-600 hover:underline text-sm">← กลับหน้าเข้าสู่ระบบครู</Link>
        <h1 className="text-2xl font-bold text-ink mt-3 mb-2">ขอเปิดใช้งาน HubMath สำหรับโรงเรียนใหม่</h1>
        <p className="text-sm text-ink-faint mb-6">กรอกข้อมูลไว้ ทีมงานจะติดต่อกลับเพื่อตั้งค่าให้</p>
        <RequestSchoolForm />
      </div>
    </div>
  );
}
