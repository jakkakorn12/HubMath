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
function baht(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท`;
}

export function generateInterestQuestion(): QuizQuestion {
  const kind = randomFrom(["simple", "compoundAnnual"] as const);
  const P = randInt(1, 10) * 1000;
  const ratePercent = randInt(2, 10);
  const t = randInt(1, 5);
  const r = ratePercent / 100;

  if (kind === "simple") {
    const interest = P * r * t;
    const correct = baht(interest);
    const choices = uniqueChoices(correct, [
      baht(P * r * (t + 1)),
      baht(P * Math.pow(1 + r, t) - P),
      baht(P * r),
    ]);
    return {
      prompt: `เงินต้น ${P.toLocaleString()} บาท ดอกเบี้ยเชิงเดี่ยว ${ratePercent}% ต่อปี ฝากไว้ ${t} ปี จะได้ดอกเบี้ยเท่าใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `I = Prt = ${P.toLocaleString()} × ${r} × ${t} = ${correct}`,
    };
  }

  const amount = P * Math.pow(1 + r, t);
  const correct = baht(amount);
  const choices = uniqueChoices(correct, [
    baht(P * (1 + r * t)),
    baht(P * Math.pow(1 + r, t + 1)),
    baht(P * (1 + r)),
  ]);
  return {
    prompt: `เงินต้น ${P.toLocaleString()} บาท ดอกเบี้ยทบต้นรายปี ${ratePercent}% ต่อปี ฝากไว้ ${t} ปี จะมีมูลค่ารวมเท่าใด (ปัดเศษ)`,
    choices,
    correct: choices.indexOf(correct),
    solution: `A = P(1+r)^{t} = ${P.toLocaleString()} × (1+${r})^{${t}} ≈ ${correct}`,
  };
}
