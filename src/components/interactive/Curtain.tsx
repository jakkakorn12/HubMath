"use client";

import { useState } from "react";

export default function Curtain({
  label = "เปิดเฉลย",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className="border-[0.5px] border-dashed border-navy-600 rounded-control p-4 bg-navy-100/40">
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="w-full border-[0.5px] border-dashed border-navy-600 rounded-control p-4 text-sm font-medium text-navy-600 hover:bg-navy-100/40 transition-colors text-center"
    >
      {label} →
    </button>
  );
}
