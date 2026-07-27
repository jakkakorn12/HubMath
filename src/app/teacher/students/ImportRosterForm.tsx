"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ParsedRow = { student_number: number; student_code: string; full_name: string };

function parsePaste(text: string): { rows: ParsedRow[]; errors: string[] } {
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, i) => {
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.length < 3) {
      errors.push(`บรรทัด ${i + 1}: ต้องมี 3 ช่อง (เลขที่, เลขประจำตัว, ชื่อ-สกุล) คั่นด้วย Tab`);
      return;
    }
    const [numStr, code, name] = cells;
    const num = Number(numStr);
    if (!code || Number.isNaN(num)) {
      errors.push(`บรรทัด ${i + 1}: เลขที่หรือเลขประจำตัวไม่ถูกต้อง`);
      return;
    }
    if (!name) {
      errors.push(`บรรทัด ${i + 1}: ไม่มีชื่อ`);
      return;
    }
    rows.push({ student_number: num, student_code: code, full_name: name });
  });

  return { rows, errors };
}

export default function ImportRosterForm({ sectionId }: { sectionId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [classLevel, setClassLevel] = useState("ม.5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { rows, errors } = parsePaste(text);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.length === 0) return;
    setSaving(true);
    setError(null);
    setDone(false);

    const res = await fetch("/api/teacher/import-roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, class_level: classLevel, rows }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "นำเข้าไม่สำเร็จ");
      setSaving(false);
      return;
    }

    setText("");
    setSaving(false);
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          วางรายชื่อจาก Excel/Google Sheets (คัดลอกคอลัมน์ เลขที่, เลขประจำตัว, ชื่อ-สกุล มาวาง)
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDone(false); }}
          rows={6}
          placeholder={"1\t50123\tนายสมชาย ใจดี\n2\t50124\tนางสาวสมหญิง ตั้งใจ"}
          className="w-full border-[0.5px] border-border rounded-control px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">ชั้น</label>
        <input
          type="text"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
          required
          className="w-32 border-[0.5px] border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
      </div>

      {errors.length > 0 && (
        <div className="bg-warning-soft rounded-control px-3 py-2 text-xs text-warning-strong space-y-0.5">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-surface rounded-control px-3 py-2 text-sm text-ink-muted">
          พร้อมนำเข้า {rows.length} คน
        </div>
      )}

      {error && <p className="text-danger-strong text-sm">{error}</p>}
      {done && <p className="text-success-strong text-sm">นำเข้ารายชื่อสำเร็จ</p>}

      <button
        type="submit"
        disabled={saving || rows.length === 0}
        className="bg-navy-900 text-white px-4 py-2 rounded-control text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "กำลังนำเข้า..." : "นำเข้ารายชื่อ"}
      </button>
    </form>
  );
}
