// วัดความคล้ายของข้อความ (สำหรับตรวจงานคัดลอก)
// วิธี: ตัดช่องว่าง/normalize แล้วเทียบชุด trigram ตัวอักษร (Jaccard)
// ทนต่อการสลับคำ/แก้เล็กน้อย — เหมาะกับภาษาไทยเพราะไม่ต้องตัดคำ

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function trigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= text.length - 3; i++) {
    set.add(text.slice(i, i + 3));
  }
  return set;
}

// คืนค่า 0..1 (1 = เหมือนกันทุกตัวอักษร)
export function textSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  // ข้อความสั้นเกินไป trigram ไม่น่าเชื่อถือ — นับเฉพาะเหมือนเป๊ะ
  if (na.length < 30 || nb.length < 30) return 0;

  const ta = trigrams(na);
  const tb = trigrams(nb);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// เกณฑ์เริ่มต้น: คล้ายเกิน 80% = น่าสงสัย
export const SIMILARITY_THRESHOLD = 0.8;
