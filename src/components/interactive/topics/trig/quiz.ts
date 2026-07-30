import type { QuizQuestion } from "../../types";
import { SPECIAL_ANGLES, quadrantOf, referenceAngle, exactValue, normalize } from "./trigMath";

const KINDS = ["sin", "cos", "tan"] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, string> = { sin: "sin", cos: "cos", tan: "tan" };

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function flipSign(val: string): string {
  if (val === "0" || val === "หาค่าไม่ได้") return val;
  return val.startsWith("-") ? val.slice(1) : `-${val}`;
}

export function generateTrigQuestion(): QuizQuestion {
  const norm = normalize(randomFrom(SPECIAL_ANGLES));
  const hasTan = norm !== 90 && norm !== 270;
  const availableKinds = hasTan ? KINDS : (["sin", "cos"] as const);
  const kind: Kind = randomFrom(availableKinds);

  const correct = exactValue(kind, norm)!;
  const otherKinds = availableKinds.filter((k) => k !== kind);
  const confusedKindVal = otherKinds.length ? exactValue(randomFrom(otherKinds), norm) : null;
  const wrongSign = flipSign(correct);
  const wrongReferenceAngleVal = exactValue(kind, normalize(180 - norm));

  const choicesSet = new Set<string>([correct]);
  const candidates = [wrongSign, confusedKindVal, wrongReferenceAngleVal].filter(
    (c): c is string => c != null
  );
  for (const c of candidates) {
    if (choicesSet.size >= 4) break;
    if (!choicesSet.has(c)) choicesSet.add(c);
  }
  const fallbackPool = ["0", "1", "-1", "[1|2]", "-[1|2]", "[√2|2]", "หาค่าไม่ได้", "ไม่มีข้อใดถูก"];
  let i = 0;
  while (choicesSet.size < 4 && i < fallbackPool.length) {
    const c = fallbackPool[i++];
    if (!choicesSet.has(c)) choicesSet.add(c);
  }

  const choices = Array.from(choicesSet);
  for (let j = choices.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [choices[j], choices[k]] = [choices[k], choices[j]];
  }
  const correctIndex = choices.indexOf(correct);

  const quadrant = quadrantOf(norm);
  const ref = referenceAngle(norm);
  const label = KIND_LABEL[kind];

  return {
    prompt: `${label} ${norm}° มีค่าเท่าใด`,
    choices,
    correct: correctIndex,
    solution: `${norm}° อยู่จตุภาคที่ ${quadrant} มุมอ้างอิงคือ ${ref}° → ${label} ${norm}° = ${correct}`,
  };
}
