import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// endpoint สำหรับ Google Apps Script เท่านั้น — ยืนยันตัวตนด้วย secret ใน header
// ใช้ service role key (อยู่ฝั่ง server เท่านั้น ไม่หลุดไป browser)

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!process.env.SHEETS_SYNC_SECRET || secret !== process.env.SHEETS_SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { action, payload } = body;

  try {
    switch (action) {
      case "get_assignments": {
        const { data, error } = await supabase
          .from("assignments")
          .select("id, title, term, category")
          .eq("subject_id", String(payload?.subject_id ?? ""));
        if (error) throw error;
        return NextResponse.json({ data });
      }
      case "get_sections": {
        const { data, error } = await supabase
          .from("sections")
          .select("id, name")
          .eq("subject_id", String(payload?.subject_id ?? ""));
        if (error) throw error;
        return NextResponse.json({ data });
      }
      case "upsert_score": {
        const { error } = await supabase
          .from("score_cache")
          .upsert(
            {
              student_code: String(payload?.student_code ?? ""),
              assignment_id: String(payload?.assignment_id ?? ""),
              score: Number(payload?.score),
            },
            { onConflict: "student_code,assignment_id" }
          );
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "delete_score": {
        const { error } = await supabase
          .from("score_cache")
          .delete()
          .eq("assignment_id", String(payload?.assignment_id ?? ""))
          .eq("student_code", String(payload?.student_code ?? ""));
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "upsert_attendance": {
        const { error } = await supabase
          .from("attendance")
          .upsert(
            {
              student_code: String(payload?.student_code ?? ""),
              section_id: String(payload?.section_id ?? ""),
              date: String(payload?.date ?? ""),
              status: String(payload?.status ?? ""),
              method: "teacher",
            },
            { onConflict: "student_code,section_id,date" }
          );
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
