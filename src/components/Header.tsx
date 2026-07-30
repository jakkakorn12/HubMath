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
    <header className="bg-navy-900">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-[7px] bg-white shrink-0" />
          <span className="font-semibold text-[15px] text-white">
            HubMath
            {role === "teacher" && <span className="font-normal text-white/60 ml-1">— ครู</span>}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/account" className="flex items-center gap-2 group min-w-0">
            <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold flex items-center justify-center shrink-0">
              {initials(name)}
            </span>
            <span className="text-sm text-white/90 group-hover:text-white transition-colors hidden sm:inline truncate max-w-[140px]">
              {displayName}
            </span>
          </Link>
          <form action="/auth/signout" method="POST">
            <button
              aria-label="ออกจากระบบ"
              className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-control"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
