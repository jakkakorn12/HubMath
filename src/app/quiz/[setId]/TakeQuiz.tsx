"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MathText } from "@/components/interactive/mathMarkup";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

type Question = {
  id: string;
  question_type: "multiple_choice" | "fill_blank";
  prompt: string;
  choices: string[] | null;
  order_index: number;
};

export default function TakeQuiz({
  setId,
  title,
  questions,
}: {
  setId: string;
  title: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_set_id: setId, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ส่งคำตอบไม่สำเร็จ");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-xs text-ink-faint mt-1">
          ตอบแล้ว {answeredCount}/{questions.length} ข้อ · ส่งได้ครั้งเดียว ตรวจสอบให้ครบก่อนส่ง
        </p>
      </div>

      <div className="divide-y divide-border">
        {questions.map((q, i) => (
          <div key={q.id} className={i > 0 ? "pt-6 pb-6" : "pb-6"}>
            <p className="text-sm font-semibold text-ink mb-3">
              {i + 1}. <MathText text={q.prompt} />
            </p>
            {q.question_type === "multiple_choice" ? (
              <div className="space-y-2">
                {(q.choices ?? []).map((c, ci) => {
                  const idx = String(ci);
                  const selected = answers[q.id] === idx;
                  return (
                    <button
                      key={ci}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      className={`w-full text-left flex items-center gap-3 border-[0.5px] rounded-control px-4 py-2.5 text-sm transition-colors ${
                        selected ? "border-navy-600 bg-navy-100/40" : "border-border hover:bg-surface"
                      }`}
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full border-[0.5px] border-current flex items-center justify-center text-xs font-medium">
                        {CHOICE_LABELS[ci]}
                      </span>
                      <span className="text-ink">
                        <MathText text={c} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="พิมพ์คำตอบ"
                className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-danger-strong text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-navy-900 text-white rounded-control py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "กำลังส่ง..." : "ส่งคำตอบ (ทำได้ครั้งเดียว)"}
      </button>
    </div>
  );
}
