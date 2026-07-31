"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";
import { QUIZ_TOPIC_LABEL, groupByTopic } from "@/lib/quizTopics";

type QuizSet = Database["public"]["Tables"]["quiz_sets"]["Row"];

const DIFFICULTY_LABEL: Record<string, string> = {
  medium: "ปานกลาง",
  hard: "ยาก",
  very_hard: "ยากมาก",
};
const DIFFICULTY_ORDER = ["medium", "hard", "very_hard"];

export default function QuizSetManager({
  subjectId,
  targetLabel,
  sets,
  questionCountBySet,
  attemptStatsBySet,
  roomNameById,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  sets: QuizSet[];
  questionCountBySet: Record<string, number>;
  attemptStatsBySet: Record<string, { count: number; avgPercent: number }>;
  roomNameById: Record<string, string>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePublish(set: QuizSet) {
    setBusyId(set.id);
    const supabase = createClient();
    await supabase.from("quiz_sets").update({ is_published: !set.is_published }).eq("id", set.id);
    setBusyId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("quiz_sets").delete().eq("id", id);
    router.refresh();
  }

  if (!subjectId) {
    return (
      <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
        เลือกวิชาด้านบนเพื่อจัดการแบบทดสอบ
      </div>
    );
  }

  const byTopic = groupByTopic(sets);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-ink-muted">แบบทดสอบ — {targetLabel}</h2>
      {sets.length === 0 ? (
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
          ยังไม่มีแบบทดสอบในวิชานี้
        </div>
      ) : (
        byTopic.map(([topicSlug, topicSets]) => {
          const byDifficulty: Record<string, QuizSet[]> = {};
          for (const s of topicSets) (byDifficulty[s.difficulty] ??= []).push(s);

          return (
            <div key={topicSlug} className="bg-white rounded-card border-[0.5px] border-border p-5">
              <h3 className="text-base font-bold text-ink mb-4">{QUIZ_TOPIC_LABEL[topicSlug] ?? "อื่นๆ"}</h3>
              <div className="space-y-4">
                {DIFFICULTY_ORDER.filter((d) => byDifficulty[d]?.length).map((d) => (
                  <div key={d}>
                    <h4 className="text-sm font-semibold text-ink-muted mb-2">ระดับ{DIFFICULTY_LABEL[d]}</h4>
                    <div className="space-y-2">
                      {byDifficulty[d].map((set) => {
                        const stats = attemptStatsBySet[set.id];
                        return (
                          <div key={set.id} className="flex items-center justify-between bg-surface rounded-control px-4 py-3 gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-ink truncate">{set.title}</p>
                              <p className="text-xs text-ink-faint">
                                {set.section_id ? `ห้อง ${roomNameById[set.section_id] ?? "?"}` : "ทุกห้อง"} ·{" "}
                                {questionCountBySet[set.id] ?? 0} ข้อ
                                {stats && ` · ทำแล้ว ${stats.count} คน · เฉลี่ย ${stats.avgPercent.toFixed(0)}%`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={set.is_published}
                                  disabled={busyId === set.id}
                                  onChange={() => togglePublish(set)}
                                  className="accent-navy-600"
                                />
                                เผยแพร่
                              </label>
                              <ConfirmButton
                                message="ลบแบบทดสอบชุดนี้ใช่ไหม?"
                                detail={`"${set.title}" และคำตอบของนักเรียนทั้งหมดในชุดนี้จะถูกลบถาวร`}
                                onConfirm={() => handleDelete(set.id)}
                              >
                                ลบ
                              </ConfirmButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
