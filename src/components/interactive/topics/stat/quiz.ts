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

export function generateStatQuestion(): QuizQuestion {
  const kind = randomFrom(["mean", "median", "range", "mode"] as const);
  const data = Array.from({ length: 5 }, () => randInt(1, 20));
  const sorted = [...data].sort((a, b) => a - b);
  const dataStr = data.join(", ");

  if (kind === "mean") {
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const correct = mean.toFixed(1);
    const choices = uniqueChoices(correct, [
      (mean + 1).toFixed(1),
      (mean - 1).toFixed(1),
      sorted[Math.floor(sorted.length / 2)].toFixed(1),
    ]);
    return {
      prompt: `ข้อมูล ${dataStr} มีค่าเฉลี่ยเท่าใด (ทศนิยม 1 ตำแหน่ง)`,
      choices,
      correct: choices.indexOf(correct),
      solution: `mean = (${data.join("+")}) ÷ ${data.length} = ${correct}`,
    };
  }

  if (kind === "median") {
    const median = sorted[Math.floor(sorted.length / 2)];
    const correct = String(median);
    const choices = uniqueChoices(correct, [String(sorted[0]), String(sorted[sorted.length - 1]), String(median + 1)]);
    return {
      prompt: `ข้อมูล ${dataStr} มีมัธยฐานเท่าใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `เรียงข้อมูลจากน้อยไปมาก: ${sorted.join(", ")} — ค่ากลางคือ ${median}`,
    };
  }

  if (kind === "range") {
    const range = sorted[sorted.length - 1] - sorted[0];
    const correct = String(range);
    const choices = uniqueChoices(correct, [String(range + 1), String(sorted[sorted.length - 1]), String(sorted[0])]);
    return {
      prompt: `ข้อมูล ${dataStr} มีพิสัยเท่าใด`,
      choices,
      correct: choices.indexOf(correct),
      solution: `พิสัย = max − min = ${sorted[sorted.length - 1]} − ${sorted[0]} = ${range}`,
    };
  }

  const withDup = [...data, data[0]];
  const shuffled = shuffle(withDup);
  const correct = String(data[0]);
  const others = Array.from(new Set(data)).filter((v) => v !== data[0]).map(String);
  const choices = uniqueChoices(correct, others);
  return {
    prompt: `ข้อมูล ${shuffled.join(", ")} มีฐานนิยมเท่าใด`,
    choices,
    correct: choices.indexOf(correct),
    solution: `${data[0]} ปรากฏซ้ำมากกว่าค่าอื่น จึงเป็นฐานนิยม`,
  };
}
