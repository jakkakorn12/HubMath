export const QUIZ_TOPIC_ORDER = [
  "trig",
  "exponent",
  "exp_log",
  "interest",
  "vector",
  "complex",
  "stat",
  "prob",
] as const;

export const QUIZ_TOPIC_LABEL: Record<string, string> = {
  trig: "ฟังก์ชันตรีโกณมิติ",
  exponent: "เลขยกกำลังและราก",
  exp_log: "ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม",
  interest: "ดอกเบี้ยและมูลค่าเงิน",
  vector: "เวกเตอร์",
  complex: "จำนวนเชิงซ้อน",
  stat: "สถิติ",
  prob: "ความน่าจะเป็น",
};

export function groupByTopic<T extends { topic_slug: string | null }>(items: T[]): [string, T[]][] {
  const byTopic: Record<string, T[]> = {};
  for (const item of items) (byTopic[item.topic_slug ?? "_other"] ??= []).push(item);

  const orderedKeys = [
    ...QUIZ_TOPIC_ORDER.filter((t) => byTopic[t]?.length),
    ...(byTopic["_other"]?.length ? ["_other"] : []),
  ];
  return orderedKeys.map((key) => [key, byTopic[key]]);
}
