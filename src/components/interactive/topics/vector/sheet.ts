import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "การบวกเวกเตอร์", formula: "u + v = (u_{x}+v_{x}, u_{y}+v_{y})" },
  { name: "การคูณด้วยสเกลาร์", formula: "ku = (ku_{x}, ku_{y})" },
  { name: "ผลคูณเชิงสเกลาร์", formula: "u · v = u_{x}v_{x} + u_{y}v_{y}" },
  { name: "เงื่อนไขตั้งฉาก", formula: "u ⊥ v  ⟺  u · v = 0" },
  { name: "ขนาดของเวกเตอร์", formula: "|u| = √(u_{x}^{2} + u_{y}^{2})" },
  { name: "มุมระหว่างเวกเตอร์", formula: "cos θ = [u · v|(|u||v|)]" },
];
