import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "นิยามฟังก์ชันเอกซ์โพเนนเชียล", formula: "y = b^{x},  b > 0, b ≠ 1" },
  { name: "ความสัมพันธ์เอกซ์โพเนนเชียล–ลอการิทึม", formula: "log_{b}(x) = y  ⟺  b^{y} = x" },
  { name: "ค่าคงที่พื้นฐาน", formula: "log_{b}(b) = 1,  log_{b}(1) = 0" },
  { name: "ลอการิทึมของผลคูณ", formula: "log(mn) = log(m) + log(n)" },
  { name: "ลอการิทึมของผลหาร", formula: "log([m|n]) = log(m) − log(n)" },
  { name: "ลอการิทึมของเลขยกกำลัง", formula: "log(m^{k}) = k·log(m)" },
  { name: "สูตรเปลี่ยนฐาน", formula: "log_{b}(x) = [log(x)|log(b)]" },
];
