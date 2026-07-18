// ชื่อหัวกลุ่มคะแนนแบบกำหนดเองต่อ วิชา+เทอม+หมวด
// key: `${subject_id}__${term}__${category}` — ไม่มีในนี้จะใช้ชื่อกลาง (งานฝึก / สอบย่อย ฯลฯ)
export const CATEGORY_TITLE_OVERRIDES: Record<string, string> = {
  // คณิตศาสตร์พื้นฐาน 3 · ครึ่งแรก
  "11111111-0000-0000-0000-000000000001__1__practice":
    "แบบฝึกหัด / สอบย่อย เรื่อง เลขยกกำลัง",
};

export function categoryTitle(
  subjectId: string,
  term: number,
  category: string,
  fallback: string
): string {
  return CATEGORY_TITLE_OVERRIDES[`${subjectId}__${term}__${category}`] ?? fallback;
}
