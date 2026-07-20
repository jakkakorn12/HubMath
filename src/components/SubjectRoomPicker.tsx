"use client";

import { usePathname, useRouter } from "next/navigation";

type Subject = { id: string; name: string };
type Section = { id: string; name: string; subject_id: string };

export default function SubjectRoomPicker({
  subjects,
  sections,
  subjectId,
  sectionId,
  showAllSubjects = true,
  requireRoom = false,
}: {
  subjects: Subject[];
  sections: Section[];
  subjectId?: string;
  sectionId?: string;
  showAllSubjects?: boolean;
  requireRoom?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(nextSubject?: string, nextSection?: string) {
    const params = new URLSearchParams();
    if (nextSubject) params.set("subject_id", nextSubject);
    if (nextSection) params.set("section_id", nextSection);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const roomsOfSubject = sections.filter((s) => s.subject_id === subjectId);

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <div>
        <label className="block text-xs text-ink-faint mb-1">วิชา</label>
        <select
          value={subjectId ?? ""}
          onChange={(e) => go(e.target.value || undefined, undefined)}
          className="border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
        >
          {showAllSubjects && <option value="">ทุกวิชา</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {subjectId && (
        <div>
          <label className="block text-xs text-ink-faint mb-1">ห้อง</label>
          <select
            value={sectionId ?? ""}
            onChange={(e) => go(subjectId, e.target.value || undefined)}
            className="border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
          >
            {!requireRoom && <option value="">ทุกห้อง</option>}
            {requireRoom && <option value="">— เลือกห้อง —</option>}
            {roomsOfSubject.map((s) => (
              <option key={s.id} value={s.id}>ห้อง {s.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
