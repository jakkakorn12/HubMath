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
  category: AssignmentCategory;
  term: 1 | 2;
  max_score: number;
};

export default function AssignmentManager({
  subjectId,
  assignments,
}: {
  subjectId: string;
  assignments: AssignmentListItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AssignmentCategory>("practice");
  const [term, setTerm] = useState<1 | 2>(1);
  const [maxScore, setMaxScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/teacher/create-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_id: subjectId, title, category, term, max_score: Number(maxScore) }),
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
        <div className="space-y-1.5">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-surface rounded-control px-3 py-2 text-sm">
              <span className="text-ink">{a.title}</span>
              <span className="text-ink-faint text-xs">
                {CATEGORY_LABEL[a.category]} · เทอม {a.term} · เต็ม {a.max_score}
              </span>
            </div>
          ))}
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
        <div>
          <label className="block text-xs font-medium text-ink mb-1">หมวด</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AssignmentCategory)}
            className="border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            {(Object.keys(CATEGORY_LABEL) as AssignmentCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">เทอม</label>
          <select
            value={term}
            onChange={(e) => setTerm(Number(e.target.value) as 1 | 2)}
            className="border-[0.5px] border-border rounded-control px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
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
