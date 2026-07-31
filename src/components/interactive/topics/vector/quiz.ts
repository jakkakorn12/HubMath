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

const PYTHAGOREAN_TRIOS = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
] as const;

export function generateVectorQuestion(): QuizQuestion {
  const kind = randomFrom(["sum", "dot", "magnitude"] as const);
  const ux = randInt(-5, 5);
  const uy = randInt(-5, 5);
  const vx = randInt(-5, 5);
  const vy = randInt(-5, 5);

  if (kind === "sum") {
    const correct = `(${ux + vx}, ${uy + vy})`;
    const choices = uniqueChoices(correct, [`(${ux - vx}, ${uy - vy})`, `(${ux * vx}, ${uy * vy})`, `(${vx - ux}, ${vy - uy})`]);
    return {
      prompt: `u = (${ux}, ${uy}), v = (${vx}, ${vy}) แล้ว u + v เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `บวกทีละพิกัด: u + v = (${ux}+${vx}, ${uy}+${vy}) = ${correct}`,
    };
  }

  if (kind === "dot") {
    const correctVal = ux * vx + uy * vy;
    const correct = String(correctVal);
    const choices = uniqueChoices(correct, [String(ux * vx), String((ux + vx) * (uy + vy)), String(correctVal + 1)]);
    return {
      prompt: `u = (${ux}, ${uy}), v = (${vx}, ${vy}) แล้ว u · v เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `u · v = (${ux}×${vx}) + (${uy}×${vy}) = ${ux * vx} + ${uy * vy} = ${correctVal}`,
    };
  }

  const [mx, my, mag] = randomFrom(PYTHAGOREAN_TRIOS);
  const correct = String(mag);
  const choices = uniqueChoices(correct, [String(mx + my), String(mag + 1), String(mag - 1)]);
  return {
    prompt: `ขนาดของเวกเตอร์ (${mx}, ${my}) เท่ากับข้อใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `|w| = √(${mx}^{2} + ${my}^{2}) = √${mx * mx + my * my} = ${mag}`,
  };
}
