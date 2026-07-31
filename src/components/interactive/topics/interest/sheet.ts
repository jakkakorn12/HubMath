import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "ดอกเบี้ยเชิงเดี่ยว", formula: "I = Prt" },
  { name: "มูลค่ารวม (ดอกเบี้ยเชิงเดี่ยว)", formula: "A = P(1 + rt)" },
  { name: "ดอกเบี้ยทบต้น", formula: "A = P(1 + [r|n])^{nt}" },
  { name: "มูลค่าปัจจุบัน", formula: "P = [A|(1 + [r|n])^{nt}]" },
  { name: "อัตราดอกเบี้ยที่แท้จริงต่อปี", formula: "(1 + [r|n])^{n} − 1" },
  { name: "กฎ 72 (ประมาณเงินเป็นสองเท่า)", formula: "ปี ≈ [72|อัตราดอกเบี้ย%]" },
];
