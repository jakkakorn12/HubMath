// เช็คชื่อเก็บได้ 2 แถวต่อวัน (QR ของนักเรียน + ครูกรอกใน Sheets)
// เวลาแสดงผล/นับสถิติ ให้ยุบเหลือแถวเดียวต่อ key โดยของครู (method=teacher) ชนะ QR เสมอ
export function dedupeAttendance<T extends { method: string }>(
  rows: T[],
  keyFn: (r: T) => string
): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const key = keyFn(r);
    const existing = map.get(key);
    if (!existing || (existing.method === "qr" && r.method === "teacher")) {
      map.set(key, r);
    }
  }
  return [...map.values()];
}
