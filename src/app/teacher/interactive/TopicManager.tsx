"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type TopicRow = Database["public"]["Tables"]["interactive_topics"]["Row"];
type RegistryEntry = { slug: string; name: string; subtitle: string };

export default function TopicManager({
  subjectId,
  sectionId,
  targetLabel,
  enabledTopics,
  registry,
}: {
  subjectId: string | null;
  sectionId: string | null;
  targetLabel: string;
  enabledTopics: TopicRow[];
  registry: RegistryEntry[];
}) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});

  function findRow(slug: string): TopicRow | undefined {
    return enabledTopics.find((t) => t.topic_slug === slug && (t.section_id ?? null) === sectionId);
  }

  async function enable(slug: string) {
    if (!subjectId) return;
    setBusySlug(slug);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("interactive_topics").insert({
      subject_id: subjectId,
      section_id: sectionId,
      topic_slug: slug,
      order_index: 0,
    });
    setBusySlug(null);
    if (insertError) {
      setError("เปิดใช้งานไม่สำเร็จ: " + insertError.message);
      return;
    }
    router.refresh();
  }

  async function disable(id: string) {
    setBusySlug(id);
    const supabase = createClient();
    await supabase.from("interactive_topics").delete().eq("id", id);
    setBusySlug(null);
    router.refresh();
  }

  async function saveOrder(id: string) {
    const draft = orderDrafts[id];
    if (draft == null) return;
    const supabase = createClient();
    await supabase
      .from("interactive_topics")
      .update({ order_index: Number(draft) || 0 })
      .eq("id", id);
    router.refresh();
  }

  if (!subjectId) {
    return (
      <div className="bg-white rounded-card border-[0.5px] border-border p-5 text-sm text-ink-faint">
        เลือกวิชาด้านบนเพื่อจัดการหน่วยฝึกโต้ตอบ
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border-[0.5px] border-border p-5 space-y-4">
      <h2 className="text-sm font-semibold text-ink-muted">หน่วยฝึกโต้ตอบ — {targetLabel}</h2>
      {error && <p className="text-danger-strong text-sm">{error}</p>}
      <div className="space-y-2">
        {registry.map((t) => {
          const row = findRow(t.slug);
          const enabled = !!row;
          return (
            <div
              key={t.slug}
              className="flex items-center justify-between bg-surface rounded-control px-4 py-3 gap-3"
            >
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={busySlug === t.slug}
                  onChange={() => (enabled ? disable(row!.id) : enable(t.slug))}
                  className="accent-navy-600"
                />
                <span>
                  <span className="block text-sm text-ink">{t.name}</span>
                  <span className="block text-xs text-ink-faint">{t.subtitle}</span>
                </span>
              </label>
              {enabled && (
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-ink-faint">ลำดับ</label>
                  <input
                    type="number"
                    defaultValue={row!.order_index}
                    onChange={(e) => setOrderDrafts((d) => ({ ...d, [row!.id]: e.target.value }))}
                    onBlur={() => saveOrder(row!.id)}
                    className="w-16 border-[0.5px] border-border rounded-control px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
