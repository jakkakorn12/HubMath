"use client";

import { useRouter } from "next/navigation";

export default function DateJumpForm({
  subjectId,
  sectionId,
  mode,
  date,
  maxDate,
}: {
  subjectId: string;
  sectionId: string;
  mode?: string;
  date: string;
  maxDate: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams({ subject_id: subjectId, section_id: sectionId, date: e.target.value });
    if (mode) params.set("mode", mode);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-ink-faint">วันที่</label>
      <input
        type="date"
        defaultValue={date}
        max={maxDate}
        onChange={handleChange}
        className="border-[0.5px] border-border rounded-control px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
      />
    </div>
  );
}
