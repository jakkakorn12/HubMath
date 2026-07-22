"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CURRENT_BE_YEAR = new Date().getFullYear() + 543;

export default function NewSubjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("basic");
  const [academicYear, setAcademicYear] = useState(String(CURRENT_BE_YEAR));
  const [rooms, setRooms] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/teacher/create-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, type, academic_year: academicYear, rooms }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "สร้างวิชาไม่สำเร็จ");
      setSaving(false);
      return;
    }

    router.push("/teacher/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">ชื่อวิชา</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น คณิตศาสตร์พื้นฐาน 4"
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">รหัสวิชา</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="เช่น ค32102"
            required
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">ประเภทวิชา</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            <option value="basic">พื้นฐาน</option>
            <option value="advanced">เพิ่มเติม</option>
            <option value="elective">เลือก</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">ปีการศึกษา (พ.ศ.)</label>
        <input
          type="text"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          required
          className="w-full sm:w-40 border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">ห้องเรียน</label>
        <input
          type="text"
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          placeholder="เช่น 8, 9, 11 (คั่นด้วยจุลภาค)"
          required
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
        <p className="text-xs text-ink-faint mt-1">ใส่ชื่อห้องได้หลายห้อง คั่นด้วยจุลภาค (,)</p>
      </div>

      {error && <p className="text-danger-strong text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-navy-900 text-white py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "กำลังสร้าง..." : "สร้างวิชา"}
      </button>
    </form>
  );
}
