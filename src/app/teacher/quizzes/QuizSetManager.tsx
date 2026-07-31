"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import ConfirmButton from "@/components/ConfirmButton";
import { QUIZ_TOPIC_LABEL, QUIZ_TOPIC_SUBTITLE, groupByTopic } from "@/lib/quizTopics";

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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

  if (sets.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-ink-muted">แบบทดสอบ — {targetLabel}</h2>
        <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
          ยังไม่มีแบบทดสอบในวิชานี้
        </div>
      </div>
    );
  }

  const activeTopic = selectedTopic && byTopic.find(([slug]) => slug === selectedTopic);

  if (!activeTopic) {
    return (
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-ink-muted">แบบทดสอบ — {targetLabel}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {byTopic.map(([topicSlug, topicSets]) => {
            const publishedCount = topicSets.filter((s) => s.is_published).length;
            return (
              <button
                key={topicSlug}
                type="button"
                onClick={() => setSelectedTopic(topicSlug)}
                className="text-left bg-white shadow-sm hover:shadow-md rounded-card border-[0.5px] border-border p-5 transition-shadow block cursor-pointer"
              >
                <h3 className="font-bold text-ink mb-1">{QUIZ_TOPIC_LABEL[topicSlug] ?? "อื่นๆ"}</h3>
                <p className="text-xs text-ink-faint mb-3">{QUIZ_TOPIC_SUBTITLE[topicSlug] ?? ""}</p>
                <p className="text-xs text-navy-600 font-medium">
                  {topicSets.length} ชุด · เผยแพร่แล้ว {publishedCount} ชุด · เปิดดู →
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const [topicSlug, topicSets] = activeTopic;
  const byDifficulty: Record<string, QuizSet[]> = {};
  for (const s of topicSets) (byDifficulty[s.difficulty] ??= []).push(s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-muted">แบบทดสอบ — {targetLabel}</h2>
        <button
          type="button"
          onClick={() => setSelectedTopic(null)}
          className="text-sm text-navy-600 hover:underline"
        >
          ← กลับไปทุกเรื่อง
        </button>
      </div>
      <div className="bg-white rounded-card border-[0.5px] border-border p-5">
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
    </div>
  );
}
