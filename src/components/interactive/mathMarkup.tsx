import type { ReactNode } from "react";

const TOKEN = /(\^\{[^{}]+\}|_\{[^{}]+\}|\[[^[\]|]+\|[^[\]]+\]|-?\d+\/\d+)/g;
const SLASH_FRACTION = /^(-?\d+)\/(\d+)$/;

function renderFraction(key: number, num: string, den: string) {
  return (
    <span key={key} className="inline-flex flex-col items-center align-middle mx-0.5 text-[0.85em] leading-tight">
      <span className="border-b border-current px-0.5">{num}</span>
      <span className="px-0.5">{den}</span>
    </span>
  );
}

export function renderMathNodes(text: string): ReactNode[] {
  return text
    .split(TOKEN)
    .filter((part) => part.length > 0)
    .map((part, i) => {
      if (part.startsWith("^{") && part.endsWith("}")) {
        return <sup key={i}>{renderMathNodes(part.slice(2, -1))}</sup>;
      }
      if (part.startsWith("_{") && part.endsWith("}")) {
        return <sub key={i}>{renderMathNodes(part.slice(2, -1))}</sub>;
      }
      if (part.startsWith("[") && part.endsWith("]") && part.includes("|")) {
        const inner = part.slice(1, -1);
        const barIdx = inner.indexOf("|");
        const num = inner.slice(0, barIdx);
        const den = inner.slice(barIdx + 1);
        return renderFraction(i, num, den);
      }
      const slashMatch = part.match(SLASH_FRACTION);
      if (slashMatch) {
        const [, num, den] = slashMatch;
        return renderFraction(i, num, den);
      }
      return <span key={i}>{part}</span>;
    });
}

export function MathText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderMathNodes(text)}</span>;
}
