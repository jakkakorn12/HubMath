import Link from "next/link";
import { LogOut, Sigma } from "lucide-react";

function initials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0] : "?";
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
  return (
    <header className="bg-white border-b-[0.5px] border-border">
      <div className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto px-4 h-14 flex items-center justify-between`}>
        <Link href={homeHref} className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-[7px] bg-navy-900 flex items-center justify-center shrink-0">
            <Sigma className="w-4 h-4 text-white" strokeWidth={2.25} />
          </span>
          <span className="font-serif font-semibold text-[15px] text-ink">
            HubMath
            {role === "teacher" && (
              <span className="font-sans font-normal text-ink-faint ml-1">— ครู</span>
            )}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/account" className="flex items-center gap-2 group min-w-0">
            <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold flex items-center justify-center shrink-0">
              {initials(name)}
            </span>
            <span className="text-sm text-ink-muted group-hover:text-ink transition-colors hidden sm:inline truncate max-w-[140px]">
              {name}
            </span>
          </Link>
          <form action="/auth/signout" method="POST">
            <button
              aria-label="ออกจากระบบ"
              className="text-ink-faint hover:text-ink-muted hover:bg-surface transition-colors p-1.5 rounded-control"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
