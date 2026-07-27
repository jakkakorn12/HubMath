"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignmentCategory } from "@/lib/supabase/types";

const CATEGORY_LABEL: Record<AssignmentCategory, string> = {
  practice: "เก็บคะแนน",
  midterm: "กลางภาค",
  final: "ปลายภาค",
  competency: "สมรรถนะ",
};

export type AssignmentListItem = {
  id: string;
  title: string;
  display_name?: string | null;
  category: AssignmentCategory;
  term: 1 | 2;
  max_score: number;
};

// ลำดับตามหลักสูตรจริง: เก็บก่อนกลางภาค → กลางภาค → เก็บหลังกลางภาค → สมรรถนะ → ปลายภาค
// (เรียงตามตัวอักษร category เฉยๆ จะได้ลำดับผิด เพราะ "practice" มาทั้งก่อนและหลังกลางภาค)
function sortPriority(category: AssignmentCategory, term: 1 | 2) {
  if (category === "practice" && term === 1) return 0;
  if (category === "midterm") return 1;
  if (category === "practice" && term === 2) return 2;
  if (category === "competency") return 3;
  if (category === "final") return 4;
  return 5;
}

export function sortAssignments(list: AssignmentListItem[]) {
  return [...list].sort(
    (a, b) =>
      sortPriority(a.category, a.term) - sortPriority(b.category, b.term) ||
      a.title.localeCompare(b.title, "th")
  );
}

// 5 หมวดจริงที่ใช้ทั้งระบบ (ตรงกับคอลัมน์ในหน้าดูสรุป) — รวม category+เทอมเป็นตัวเลือกเดียว
// กันสับสนแบบ "เก็บคะแนน" เฉยๆ ที่ไม่รู้ว่าจะได้เก็บ1 หรือเก็บ2
const BUCKET_OPTIONS: { value: string; label: string; category: AssignmentCategory; term: 1 | 2 }[] = [
  { value: "keep1", label: "เก็บก่อนกลางภาค (เก็บ 1)", category: "practice", term: 1 },
  { value: "mid", label: "กลางภาค", category: "midterm", term: 1 },
  { value: "keep2", label: "เก็บหลังกลางภาค (เก็บ 2)", category: "practice", term: 2 },
  { value: "comp", label: "สมรรถนะ", category: "competency", term: 2 },
  { value: "final", label: "ปลายภาค", category: "final", term: 2 },
];

export default function AssignmentManager({
  subjectId,
  assignments,
}: {
  subjectId: string;
  assignments: AssignmentListItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState(BUCKET_OPTIONS[0].value);
  const [maxScore, setMaxScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = BUCKET_OPTIONS.find((b) => b.value === bucket)!;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/teacher/create-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_id: subjectId,
        title,
        category: chosen.category,
        term: chosen.term,
        max_score: Number(maxScore),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "สร้างช่องคะแนนไม่สำเร็จ");
      setSaving(false);
      return;
    }

    setTitle("");
    setMaxScore("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {assignments.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            className="text-sm font-medium text-navy-600 hover:underline"
          >
            {showList ? "ซ่อนรายละเอียดช่องคะแนน" : `ดูรายละเอียดช่องคะแนน (${assignments.length})`}
          </button>
          {showList && (
            <div className="space-y-1.5 mt-2">
              {sortAssignments(assignments).map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-surface rounded-control px-3 py-2 text-sm">
                  <span className="text-ink">{a.display_name ?? a.title}</span>
                  <span className="text-ink-faint text-xs">
                    {CATEGORY_LABEL[a.category]} · เทอม {a.term} · เต็ม {a.max_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-ink mb-1">ชื่อช่องคะแนน</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ฝึก 1"
            required
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <div className="min-w-[190px]">
          <label className="block text-xs font-medium text-ink mb-1">ประเภทคะแนน</label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            {BUCKET_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-ink mb-1">คะแนนเต็ม</label>
          <input
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            required
            className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังเพิ่ม..." : "เพิ่มช่องคะแนน"}
        </button>
      </form>
      {error && <p className="text-danger-strong text-sm">{error}</p>}
    </div>
  );
}
