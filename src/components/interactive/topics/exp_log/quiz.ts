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
  let i = 0;
  const fallback = ["0", "1", "-1", "ไม่มีข้อใดถูก"];
  while (set.size < 4 && i < fallback.length) {
    if (!set.has(fallback[i])) set.add(fallback[i]);
    i++;
  }
  return shuffle(Array.from(set));
}

const KINDS = ["evalLog", "solveExp", "logProperty"] as const;

export function generateExpLogQuestion(): QuizQuestion {
  const kind = randomFrom(KINDS);
  const b = randInt(2, 5);

  if (kind === "evalLog") {
    const k = randInt(1, 4);
    const arg = Math.pow(b, k);
    const correct = String(k);
    const choices = uniqueChoices(correct, [String(k + 1), String(Math.max(0, k - 1)), String(arg)]);
    return {
      prompt: `log_{${b}}(${arg}) เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `เพราะ ${b}^{${k}} = ${arg} ดังนั้น log_{${b}}(${arg}) = ${k}`,
    };
  }

  if (kind === "solveExp") {
    const k = randInt(1, 5);
    const correct = String(k);
    const choices = uniqueChoices(correct, [String(k + 1), String(Math.max(0, k - 1)), String(k * 2)]);
    return {
      prompt: `ถ้า ${b}^{x} = ${b}^{${k}} แล้ว x เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `เมื่อฐานเท่ากัน เลขชี้กำลังต้องเท่ากัน ดังนั้น x = ${k}`,
    };
  }

  const m = randInt(2, 6);
  const n = randInt(2, 6);
  const correct = `log(${m}) + log(${n})`;
  const choices = uniqueChoices(correct, [`log(${m}) − log(${n})`, `log(${m}) × log(${n})`, `log(${m + n})`]);
  return {
    prompt: `log(${m * n}) เท่ากับข้อใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `สมบัติของลอการิทึม: log(mn) = log(m) + log(n) ดังนั้น log(${m * n}) = log(${m}) + log(${n})`,
  };
}
