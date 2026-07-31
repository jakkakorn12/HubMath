import type { QuizQuestion } from "../../types";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniqueChoices(correct: string, candidates: string[]): string[] {
  const set = new Set<string>([correct]);
  for (const c of candidates) {
    if (set.size >= 4) break;
    if (!set.has(c)) set.add(c);
  }
  return shuffle(Array.from(set));
}
function fmtComplex(a: number, b: number): string {
  if (b === 0) return String(a);
  return `${a} ${b >= 0 ? "+" : "−"} ${Math.abs(b)}i`;
}

const PYTHAGOREAN_TRIOS = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
] as const;

export function generateComplexQuestion(): QuizQuestion {
  const kind = randomFrom(["add", "multiply", "modulus", "conjugate"] as const);
  const a = randInt(-5, 5) || 2;
  const b = randInt(-5, 5) || 3;
  const c = randInt(-5, 5) || 1;
  const d = randInt(-5, 5) || -2;

  if (kind === "add") {
    const correct = fmtComplex(a + c, b + d);
    const choices = uniqueChoices(correct, [fmtComplex(a - c, b - d), fmtComplex(a * c, b * d), fmtComplex(a + d, b + c)]);
    return {
      prompt: `(${fmtComplex(a, b)}) + (${fmtComplex(c, d)}) เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `บวกส่วนจริงกับส่วนจริง ส่วนจินตภาพกับส่วนจินตภาพ: (${a}+${c}) + (${b}+${d})i = ${correct}`,
    };
  }

  if (kind === "multiply") {
    const realPart = a * c - b * d;
    const imagPart = a * d + b * c;
    const correct = fmtComplex(realPart, imagPart);
    const choices = uniqueChoices(correct, [fmtComplex(a * c + b * d, a * d + b * c), fmtComplex(a * c, b * d), fmtComplex(realPart, -imagPart)]);
    return {
      prompt: `(${fmtComplex(a, b)})(${fmtComplex(c, d)}) เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `กระจายแล้วแทน i² = −1: (${a}×${c} − ${b}×${d}) + (${a}×${d} + ${b}×${c})i = ${correct}`,
    };
  }

  if (kind === "modulus") {
    const [mx, my, mag] = randomFrom(PYTHAGOREAN_TRIOS);
    const correct = String(mag);
    const choices = uniqueChoices(correct, [String(mx + my), String(mag + 1), String(mag - 1)]);
    return {
      prompt: `|${fmtComplex(mx, my)}| เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `|z| = √(${mx}^{2} + ${my}^{2}) = √${mx * mx + my * my} = ${mag}`,
    };
  }

  const correct = fmtComplex(a, -b);
  const choices = uniqueChoices(correct, [fmtComplex(-a, b), fmtComplex(a, b), fmtComplex(-a, -b)]);
  return {
    prompt: `สังยุคของ ${fmtComplex(a, b)} คือข้อใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `สังยุคเปลี่ยนแค่เครื่องหมายส่วนจินตภาพ: สังยุคของ ${fmtComplex(a, b)} คือ ${correct}`,
  };
}
