import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "sin 0°, 30°, 45°, 60°, 90°", formula: "0, [1|2], [√2|2], [√3|2], 1" },
  { name: "cos 0°, 30°, 45°, 60°, 90°", formula: "1, [√3|2], [√2|2], [1|2], 0" },
  { name: "tan θ", formula: "tan θ = [sin θ|cos θ]" },
  { name: "อัตลักษณ์พื้นฐาน", formula: "sin^{2}θ + cos^{2}θ = 1" },
  { name: "องศา ↔ เรเดียน", formula: "180° = π rad" },
  { name: "มุมตรงข้าม", formula: "sin(180°−θ) = sin θ,  cos(180°−θ) = −cos θ" },
  { name: "มุมลบ", formula: "sin(−θ) = −sin θ,  cos(−θ) = cos θ" },
  { name: "มุมเสริม", formula: "sin(90°−θ) = cos θ,  cos(90°−θ) = sin θ" },
];
