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
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function nPr(n: number, r: number): number {
  return factorial(n) / factorial(n - r);
}
function nCr(n: number, r: number): number {
  return factorial(n) / (factorial(r) * factorial(n - r));
}

export function generateProbQuestion(): QuizQuestion {
  const kind = randomFrom(["counting", "permutation", "combination", "diceSum"] as const);

  if (kind === "counting") {
    const a = randInt(2, 5);
    const b = randInt(2, 5);
    const correct = String(a * b);
    const choices = uniqueChoices(correct, [String(a + b), String(a * b + 1), String(a * b - 1 || 1)]);
    return {
      prompt: `เสื้อมี ${a} สี กางเกงมี ${b} แบบ เลือกเสื้อ 1 ตัวและกางเกง 1 ตัว จะแต่งตัวได้กี่แบบ`,
      choices,
      correct: choices.indexOf(correct),
      solution: `ใช้กฎการนับ (คูณ): ${a} × ${b} = ${correct}`,
    };
  }

  if (kind === "permutation") {
    const n = randInt(4, 6);
    const r = randInt(2, 3);
    const correct = String(nPr(n, r));
    const choices = uniqueChoices(correct, [String(nCr(n, r)), String(n * r), String(nPr(n, r) + 1)]);
    return {
      prompt: `มีคน ${n} คน เลือกมายืนเรียงแถว ${r} ตำแหน่ง (สนใจลำดับ) ได้กี่วิธี`,
      choices,
      correct: choices.indexOf(correct),
      solution: `การเรียงสับเปลี่ยน: P(${n},${r}) = ${n}!/(${n}-${r})! = ${correct}`,
    };
  }

  if (kind === "combination") {
    const n = randInt(4, 7);
    const r = randInt(2, 3);
    const correct = String(nCr(n, r));
    const choices = uniqueChoices(correct, [String(nPr(n, r)), String(n * r), String(nCr(n, r) + 1)]);
    return {
      prompt: `มีคน ${n} คน เลือกเป็นกรรมการ ${r} คน (ไม่สนตำแหน่ง) ได้กี่วิธี`,
      choices,
      correct: choices.indexOf(correct),
      solution: `การจัดหมู่: C(${n},${r}) = ${n}!/(${r}!(${n}-${r})!) = ${correct}`,
    };
  }

  const target = randInt(2, 12);
  let ways = 0;
  for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === target) ways++;
  const correct = `[${ways}|36]`;
  const choices = uniqueChoices(correct, [`[${ways + 1}|36]`, `[${ways}|6]`, `[1|36]`]);
  return {
    prompt: `ทอดลูกเต๋า 2 ลูก ความน่าจะเป็นที่ผลรวมเท่ากับ ${target} เท่ากับข้อใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `จำนวนวิธีที่ผลรวมเป็น ${target} มี ${ways} วิธี จากทั้งหมด 36 วิธี ดังนั้น P = ${correct}`,
  };
}
