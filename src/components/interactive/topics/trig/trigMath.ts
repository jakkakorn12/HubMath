export const SPECIAL_ANGLES = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

const REFERENCE_EXACT: Record<number, { sin: string; cos: string; tan: string }> = {
  0: { sin: "0", cos: "1", tan: "0" },
  30: { sin: "[1|2]", cos: "[√3|2]", tan: "[1|√3]" },
  45: { sin: "[√2|2]", cos: "[√2|2]", tan: "1" },
  60: { sin: "[√3|2]", cos: "[1|2]", tan: "√3" },
  90: { sin: "1", cos: "0", tan: "หาค่าไม่ได้" },
};

const SIGN: Record<1 | 2 | 3 | 4, { sin: number; cos: number; tan: number }> = {
  1: { sin: 1, cos: 1, tan: 1 },
  2: { sin: 1, cos: -1, tan: -1 },
  3: { sin: -1, cos: -1, tan: 1 },
  4: { sin: -1, cos: 1, tan: -1 },
};

export function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function quadrantOf(norm: number): 1 | 2 | 3 | 4 {
  if (norm <= 90) return 1;
  if (norm <= 180) return 2;
  if (norm <= 270) return 3;
  return 4;
}

export function referenceAngle(norm: number): number {
  if (norm <= 90) return norm;
  if (norm <= 180) return 180 - norm;
  if (norm <= 270) return norm - 180;
  return 360 - norm;
}

export function exactValue(kind: "sin" | "cos" | "tan", norm: number): string | null {
  if (!SPECIAL_ANGLES.includes(norm)) return null;
  const ref = referenceAngle(norm);
  const entry = REFERENCE_EXACT[ref];
  if (!entry) return null;
  const val = entry[kind];
  if (val === "หาค่าไม่ได้" || val === "0") return val;
  const sign = SIGN[quadrantOf(norm)][kind];
  return sign < 0 ? `-${val}` : val;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function radianLabel(norm: number): string {
  if (norm === 0) return "0";
  let num = norm;
  let den = 180;
  const g = gcd(num, den);
  num /= g;
  den /= g;
  const numPart = num === 1 ? "π" : `${num}π`;
  return den === 1 ? numPart : `[${numPart}|${den}]`;
}
