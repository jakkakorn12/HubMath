"use client";

import { useState } from "react";
import { AlertTriangle, Paperclip } from "lucide-react";
import GradeForm from "./GradeForm";

export default function SubmissionCard({
  submissionId,
  roomName,
  number,
  studentName,
  studentCode,
  initialGrade,
  initialFeedback,
  assignmentId,
  maxScore,
  reducedMaxScore,
  matches,
  fileName,
  fileLink,
  content,
  submittedAt,
  dueDate,
}: {
  submissionId: string;
  roomName: string;
  number: number;
  studentName: string | undefined;
  studentCode: string | undefined;
  initialGrade: number | null;
  initialFeedback: string | null;
  assignmentId: string | null;
  maxScore: number | null;
  reducedMaxScore: number | null;
  matches: { name: string; percent: number }[];
  fileName: string | null;
  fileLink: string | undefined;
  content: string | null;
  submittedAt: string;
  dueDate: string | null;
}) {
  const [grade, setGrade] = useState(initialGrade);
  const isLate = dueDate != null && new Date(submittedAt) > new Date(dueDate);
  const lateDays = isLate ? Math.max(1, Math.ceil((new Date(submittedAt).getTime() - new Date(dueDate!).getTime()) / 86400000)) : 0;

  return (
    <div className={`bg-white rounded-card border p-5 ${matches.length > 0 ? "border-red-300" : "border-border"}`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs text-ink-faint shrink-0 whitespace-nowrap tabular-nums pt-1">
            ห้อง {roomName} · {number || "—"}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">{studentName}</p>
            <p className="text-xs text-ink-faint">{studentCode}</p>
          </div>
        </div>
        {grade != null && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-success-soft text-success-strong shrink-0">
            ตรวจแล้ว · {grade} คะแนน
          </span>
        )}
      </div>

      {matches.length > 0 && (
        <div className="mb-3 bg-danger-soft rounded-control px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-danger-strong shrink-0 mt-0.5" />
          <p className="text-xs text-danger-strong">
            <span className="font-semibold">คล้ายกับ {matches.length} คน:</span>{" "}
            {matches.map((m) => `${m.name} (${m.percent}%)`).join(", ")}
          </p>
        </div>
      )}
      {fileName ? (
        <a
          href={fileLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:underline"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {fileName}
        </a>
      ) : (
        <p className="text-sm text-ink-muted whitespace-pre-wrap bg-surface rounded-control px-3 py-2">
          {content}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        <p className="text-xs text-ink-faint">
          ส่งเมื่อ {new Date(submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
          {dueDate && ` (กำหนดส่ง ${new Date(dueDate).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })})`}
        </p>
        {isLate && (
          <p className="text-xs font-medium text-danger-strong shrink-0 whitespace-nowrap">
            ส่งช้า {lateDays} วัน
          </p>
        )}
      </div>
      <GradeForm
        submissionId={submissionId}
        initialGrade={initialGrade}
        initialFeedback={initialFeedback}
        assignmentId={assignmentId}
        maxScore={maxScore}
        reducedMaxScore={reducedMaxScore}
        onSaved={setGrade}
      />
    </div>
  );
}
