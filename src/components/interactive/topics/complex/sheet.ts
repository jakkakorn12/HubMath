import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "หน่วยจินตภาพ", formula: "i^{2} = −1" },
  { name: "การบวก", formula: "(a+bi) + (c+di) = (a+c) + (b+d)i" },
  { name: "การคูณ", formula: "(a+bi)(c+di) = (ac−bd) + (ad+bc)i" },
  { name: "สังยุค", formula: "z̄ = a − bi" },
  { name: "ค่าสัมบูรณ์", formula: "|z| = √(a^{2} + b^{2})" },
  { name: "การคูณบนระนาบ = หมุน+ขยาย", formula: "|z×w| = |z||w|,  arg(z×w) = arg(z)+arg(w)" },
];
