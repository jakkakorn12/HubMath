import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "กฎการนับ (คูณ)", formula: "จำนวนวิธี = m × n × ..." },
  { name: "การเรียงสับเปลี่ยน", formula: "P(n, r) = [n!|(n-r)!]" },
  { name: "การจัดหมู่", formula: "C(n, r) = [n!|r!(n-r)!]" },
  { name: "ความน่าจะเป็นของเหตุการณ์", formula: "P(E) = [n(E)|n(S)]" },
  { name: "ขอบเขตความน่าจะเป็น", formula: "0 ≤ P(E) ≤ 1" },
];
