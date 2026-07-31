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
  const fallback = ["1", "0", "-1", "2", "ไม่มีข้อใดถูก"];
  while (set.size < 4 && i < fallback.length) {
    if (!set.has(fallback[i])) set.add(fallback[i]);
    i++;
  }
  return shuffle(Array.from(set));
}

const RULES = ["multiply", "divide", "power", "zero", "negative"] as const;
type Rule = (typeof RULES)[number];

export function generateExponentQuestion(): QuizQuestion {
  const rule: Rule = randomFrom(RULES);
  const a = randInt(2, 5);

  if (rule === "multiply") {
    const m = randInt(2, 5);
    const n = randInt(2, 5);
    const correctExp = m + n;
    const correct = `${a}^{${correctExp}}`;
    const choices = uniqueChoices(correct, [`${a}^{${m * n}}`, `${a}^{${Math.abs(m - n)}}`, `${a * a}^{${m + n}}`]);
    return {
      prompt: `${a}^{${m}} × ${a}^{${n}} เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `เมื่อฐานเดียวกันคูณกัน ให้บวกเลขชี้กำลัง: ${a}^{${m}} × ${a}^{${n}} = ${a}^{${m}+${n}} = ${correct}`,
    };
  }

  if (rule === "divide") {
    const m = randInt(3, 6);
    const n = randInt(1, m - 1);
    const correctExp = m - n;
    const correct = `${a}^{${correctExp}}`;
    const choices = uniqueChoices(correct, [`${a}^{${m + n}}`, `${a}^{${m * n}}`, `${a}^{${n - m}}`]);
    return {
      prompt: `${a}^{${m}} ÷ ${a}^{${n}} เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `เมื่อฐานเดียวกันหารกัน ให้ลบเลขชี้กำลัง: ${a}^{${m}} ÷ ${a}^{${n}} = ${a}^{${m}-${n}} = ${correct}`,
    };
  }

  if (rule === "power") {
    const m = randInt(2, 4);
    const n = randInt(2, 4);
    const correctExp = m * n;
    const correct = `${a}^{${correctExp}}`;
    const choices = uniqueChoices(correct, [`${a}^{${m + n}}`, `${a}^{${m}}`, `${a}^{${n}}`]);
    return {
      prompt: `(${a}^{${m}})^{${n}} เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `ยกกำลังซ้อน ให้คูณเลขชี้กำลัง: (${a}^{${m}})^{${n}} = ${a}^{${m}×${n}} = ${correct}`,
    };
  }

  if (rule === "zero") {
    const correct = "1";
    const choices = uniqueChoices(correct, ["0", String(a), `${a}^{0}`]);
    return {
      prompt: `${a}^{0} เท่ากับข้อใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `ตัวเลขใดๆ (ที่ไม่ใช่ 0) ยกกำลัง 0 มีค่าเท่ากับ 1 เสมอ: ${a}^{0} = 1`,
    };
  }

  const n = randInt(1, 4);
  const pow = Math.pow(a, n);
  const correct = `[1|${pow}]`;
  const choices = uniqueChoices(correct, [`-${pow}`, String(pow), `[${pow}|1]`]);
  return {
    prompt: `${a}^{-${n}} เท่ากับข้อใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `เลขชี้กำลังเป็นลบ ให้กลับเศษส่วนแล้วเปลี่ยนเป็นบวก: ${a}^{-${n}} = [1|${a}^{${n}}] = ${correct}`,
  };
}
