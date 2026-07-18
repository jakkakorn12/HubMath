import Link from "next/link";
import { UserPlus, KeyRound, Smartphone, MessageCircleQuestion } from "lucide-react";

export const dynamic = "force-static";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">← กลับหน้าเข้าสู่ระบบ</Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">วิธีใช้งาน HubMath</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <UserPlus className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-800">สมัครสมาชิกครั้งแรก</h2>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
            <li>กด "สมัครสมาชิก" ที่หน้าเข้าสู่ระบบ</li>
            <li>กรอก <span className="font-medium text-gray-800">เลขประจำตัวนักเรียน</span> (5 หลัก เช่นที่ใช้ในโรงเรียน)</li>
            <li>กรอก <span className="font-medium text-gray-800">อีเมลจริงของตัวเอง</span> — ต้องเข้าถึงได้ ใช้กู้รหัสผ่าน</li>
            <li>ตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร</li>
            <li>ระบบจะดึงชื่อ ห้อง และคะแนนของคุณให้อัตโนมัติ</li>
          </ol>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <KeyRound className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-800">ลืมรหัสผ่าน</h2>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
            <li>กด "ลืมรหัสผ่าน?" ที่หน้าเข้าสู่ระบบ</li>
            <li>กรอกเลขประจำตัวนักเรียน</li>
            <li>เปิดอีเมลของคุณ (เช็คถังขยะ/สแปมด้วย) แล้วกดลิงก์ในอีเมลจาก HubMath</li>
            <li>ตั้งรหัสผ่านใหม่ได้เลย</li>
          </ol>
          <p className="text-sm text-gray-500 mt-3">
            เข้าสู่ระบบอยู่แล้วอยากเปลี่ยนรหัสผ่าน? กดที่<span className="font-medium">ชื่อของคุณ</span>มุมขวาบน → เปลี่ยนรหัสผ่าน
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Smartphone className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-800">ติดตั้งเป็นแอปบนมือถือ</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium text-gray-800">Android (Chrome):</span> เปิดเว็บ → กดเมนู ⋮ มุมขวาบน → "เพิ่มลงในหน้าจอหลัก"</p>
            <p><span className="font-medium text-gray-800">iPhone (Safari):</span> เปิดเว็บ → กดปุ่มแชร์ → "เพิ่มลงในหน้าจอโฮม"</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <MessageCircleQuestion className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-800">ติดปัญหาอื่นๆ</h2>
          </div>
          <p className="text-sm text-gray-600">
            สมัครไม่ผ่าน คะแนนไม่ตรง หรือปัญหาอื่น — แจ้งครูผู้สอนวิชาคณิตศาสตร์ได้โดยตรงในคาบเรียน
          </p>
        </div>
      </main>
    </div>
  );
}
