import Link from "next/link";
import { LogOut } from "lucide-react";

const TITLE_PREFIXES = ["นางสาว", "นาย", "นาง", "เด็กชาย", "เด็กหญิง", "ด.ญ.", "ด.ช."];

function stripTitle(name: string) {
  const trimmed = name.trim();
  for (const t of TITLE_PREFIXES) {
    if (trimmed.startsWith(t)) return trimmed.slice(t.length).trim();
  }
  return trimmed;
}

function initials(name: string) {
  const clean = stripTitle(name);
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return clean.slice(0, 2) || "?";
}

export default function Header({
  name,
  role,
  homeHref,
  wide = false,
}: {
  name: string;
  role: "teacher" | "student";
  homeHref: string;
  wide?: boolean;
}) {
  const displayName = stripTitle(name);

  return (
    <header className="pt-4 px-4">
      <div className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto`}>
        <div className="flex items-center justify-between bg-white rounded-full border-[0.8px] border-navy-900/10 shadow-[0_2px_4px_rgba(4,44,83,0.10),0_8px_16px_-4px_rgba(4,44,83,0.12)] px-4 h-14">
          <Link href={homeHref} className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-full bg-navy-900 shrink-0" />
            <span className="font-bold text-[15px] text-navy-900">
              HubMath
              {role === "teacher" && <span className="font-normal text-ink-faint ml-1">— ครู</span>}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/account" className="flex items-center gap-2 group min-w-0">
              <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold flex items-center justify-center shrink-0">
                {initials(name)}
              </span>
              <span className="text-sm text-ink group-hover:text-navy-900 transition-colors hidden sm:inline truncate max-w-[140px]">
                {displayName}
              </span>
            </Link>
            <form action="/auth/signout" method="POST">
              <button
                aria-label="ออกจากระบบ"
                className="text-ink-faint hover:text-navy-900 hover:bg-surface transition-colors p-1.5 rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
