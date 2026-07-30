"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTopic } from "@/components/interactive/topics/registry";
import StepLesson from "@/components/interactive/StepLesson";
import QuizPanel from "@/components/interactive/QuizPanel";
import FormulaSheet from "@/components/interactive/FormulaSheet";
import Timer from "@/components/interactive/Timer";
import TeamScoreboard from "@/components/interactive/TeamScoreboard";

type Tab = "lesson" | "tool" | "quiz" | "sheet";

export default function InteractiveUnit({
  topicSlug,
  initialSeen,
  initialAsked,
  initialCorrect,
}: {
  topicSlug: string;
  initialSeen: number;
  initialAsked: number;
  initialCorrect: number;
}) {
  const def = getTopic(topicSlug);
  const [tab, setTab] = useState<Tab>("lesson");
  const [seen, setSeen] = useState(initialSeen);
  const [asked, setAsked] = useState(initialAsked);
  const [correct, setCorrect] = useState(initialCorrect);

  async function persist(next: { seen?: number; asked?: number; correct?: number }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("interactive_progress").upsert(
      {
        student_id: user.id,
        topic_slug: topicSlug,
        seen: next.seen ?? seen,
        asked: next.asked ?? asked,
        correct: next.correct ?? correct,
      },
      { onConflict: "student_id,topic_slug" }
    );
  }

  function onStepSeen(index: number) {
    const nextSeen = Math.max(seen, index + 1);
    if (nextSeen !== seen) {
      setSeen(nextSeen);
      persist({ seen: nextSeen });
    }
  }

  function onAnswered(isCorrect: boolean) {
    const nextAsked = asked + 1;
    const nextCorrect = isCorrect ? correct + 1 : correct;
    setAsked(nextAsked);
    setCorrect(nextCorrect);
    persist({ asked: nextAsked, correct: nextCorrect });
  }

  if (!def) {
    return <p className="text-sm text-ink-faint">ไม่พบหน่วยฝึกโต้ตอบนี้</p>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "lesson", label: "บทเรียน" },
    { key: "tool", label: def.toolName },
    { key: "quiz", label: "ฝึกทำ" },
    { key: "sheet", label: "สรุปสูตร" },
  ];

  const ToolComponent = def.ToolComponent;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">{def.name}</h1>
        <p className="text-sm text-ink-faint">{def.subtitle}</p>
      </div>

      <div className="flex gap-5 border-b-[0.5px] border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              t.key === tab
                ? "border-navy-900 text-navy-900 font-medium"
                : "border-transparent text-ink-faint hover:text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lesson" && <StepLesson steps={def.steps} onStepSeen={onStepSeen} />}
      {tab === "tool" && <ToolComponent />}
      {tab === "quiz" && (
        <div className="space-y-5">
          <QuizPanel generate={def.generateQuestion} onAnswered={onAnswered} />
          <div className="bg-white rounded-card border-[0.5px] border-border p-4">
            <p className="text-xs font-semibold text-ink-muted mb-2">ตัวจับเวลา</p>
            <Timer />
          </div>
          <TeamScoreboard />
        </div>
      )}
      {tab === "sheet" && <FormulaSheet sheet={def.sheet} topicName={def.name} />}
    </div>
  );
}
