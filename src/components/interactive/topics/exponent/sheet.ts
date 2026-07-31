import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "การคูณฐานเดียวกัน", formula: "a^{m} × a^{n} = a^{m+n}" },
  { name: "การหารฐานเดียวกัน", formula: "a^{m} ÷ a^{n} = a^{m-n}" },
  { name: "ยกกำลังซ้อน", formula: "(a^{m})^{n} = a^{mn}" },
  { name: "กระจายผลคูณ", formula: "(ab)^{n} = a^{n}b^{n}" },
  { name: "เลขชี้กำลังศูนย์", formula: "a^{0} = 1" },
  { name: "เลขชี้กำลังลบ", formula: "a^{-n} = [1|a^{n}]" },
  { name: "เลขชี้กำลังเศษส่วน (ราก)", formula: "a^{[1|n]} = ⁿ√a" },
];
