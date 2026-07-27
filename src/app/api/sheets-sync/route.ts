import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// endpoint สำหรับ Google Apps Script เท่านั้น — ยืนยันตัวตนด้วย secret ต่อครู (teachers.sync_secret)
// แต่ละครูมี secret ของตัวเอง ไม่ใช้ secret กลางร่วมกันแล้ว กันครูคนหนึ่งเขียนทับข้อมูลครูอื่น
// ใช้ service role key (อยู่ฝั่ง server เท่านั้น ไม่หลุดไป browser)

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ownsSubject(supabase: ReturnType<typeof serviceClient>, teacherId: string, subjectId: string) {
  const { data } = await supabase
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return !!data;
}

async function ownsSection(supabase: ReturnType<typeof serviceClient>, teacherId: string, sectionId: string) {
  const { data: section } = await supabase.from("sections").select("subject_id").eq("id", sectionId).maybeSingle();
  if (!section) return false;
  return ownsSubject(supabase, teacherId, section.subject_id);
}

async function ownsAssignment(supabase: ReturnType<typeof serviceClient>, teacherId: string, assignmentId: string) {
  const { data: assignment } = await supabase.from("assignments").select("subject_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return false;
  return ownsSubject(supabase, teacherId, assignment.subject_id);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = serviceClient();
  const { data: teacher } = await supabase.from("teachers").select("id").eq("sync_secret", secret).maybeSingle();
  if (!teacher) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const teacherId = teacher.id;

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { action, payload } = body;

  try {
    switch (action) {
      case "get_assignments": {
        const subjectId = String(payload?.subject_id ?? "");
        if (!(await ownsSubject(supabase, teacherId, subjectId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { data, error } = await supabase
          .from("assignments")
          .select("id, title, term, category")
          .eq("subject_id", subjectId);
        if (error) throw error;
        return NextResponse.json({ data });
      }
      case "get_sections": {
        const subjectId = String(payload?.subject_id ?? "");
        if (!(await ownsSubject(supabase, teacherId, subjectId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { data, error } = await supabase
          .from("sections")
          .select("id, name")
          .eq("subject_id", subjectId);
        if (error) throw error;
        return NextResponse.json({ data });
      }
      case "upsert_score": {
        const assignmentId = String(payload?.assignment_id ?? "");
        if (!(await ownsAssignment(supabase, teacherId, assignmentId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { error } = await supabase
          .from("score_cache")
          .upsert(
            {
              student_code: String(payload?.student_code ?? ""),
              assignment_id: assignmentId,
              score: Number(payload?.score),
            },
            { onConflict: "student_code,assignment_id" }
          );
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      // เหมือน upsert_score แต่รับหลายแถวในคำขอเดียว — กันสคริปต์ยิง 1 request ต่อ 1 เซลล์
      // ตอนวาง/import คะแนนทีเดียวหลายร้อยแถว (เสี่ยงชน execution time limit ของ Apps Script)
      case "upsert_scores_batch": {
        const rows = Array.isArray(payload?.rows) ? (payload!.rows as unknown[]) : [];
        if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });
        const parsed = rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            student_code: String(row.student_code ?? ""),
            assignment_id: String(row.assignment_id ?? ""),
            score: Number(row.score),
          };
        });
        const assignmentIds = [...new Set(parsed.map((r) => r.assignment_id))];
        for (const id of assignmentIds) {
          if (!(await ownsAssignment(supabase, teacherId, id))) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
          }
        }
        const { error } = await supabase
          .from("score_cache")
          .upsert(parsed, { onConflict: "student_code,assignment_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true, count: rows.length });
      }
      case "delete_score": {
        const assignmentId = String(payload?.assignment_id ?? "");
        if (!(await ownsAssignment(supabase, teacherId, assignmentId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { error } = await supabase
          .from("score_cache")
          .delete()
          .eq("assignment_id", assignmentId)
          .eq("student_code", String(payload?.student_code ?? ""));
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "upsert_attendance": {
        const sectionId = String(payload?.section_id ?? "");
        if (!(await ownsSection(supabase, teacherId, sectionId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { error } = await supabase
          .from("attendance")
          .upsert(
            {
              student_code: String(payload?.student_code ?? ""),
              section_id: sectionId,
              date: String(payload?.date ?? ""),
              status: String(payload?.status ?? ""),
              method: "teacher",
            },
            { onConflict: "student_code,section_id,date,method" }
          );
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      // เหมือน upsert_attendance แต่รับหลายแถวในคำขอเดียว — เหตุผลเดียวกับ upsert_scores_batch
      case "upsert_attendance_batch": {
        const rows = Array.isArray(payload?.rows) ? (payload!.rows as unknown[]) : [];
        if (rows.length === 0) return NextResponse.json({ ok: true, count: 0 });
        const parsed = rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            student_code: String(row.student_code ?? ""),
            section_id: String(row.section_id ?? ""),
            date: String(row.date ?? ""),
            status: String(row.status ?? ""),
            method: "teacher" as const,
          };
        });
        const sectionIds = [...new Set(parsed.map((r) => r.section_id))];
        for (const id of sectionIds) {
          if (!(await ownsSection(supabase, teacherId, id))) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
          }
        }
        const { error } = await supabase
          .from("attendance")
          .upsert(parsed, { onConflict: "student_code,section_id,date,method" });
        if (error) throw error;
        return NextResponse.json({ ok: true, count: rows.length });
      }
      case "delete_attendance": {
        // ลบเฉพาะแถวที่ครูกรอก (ไม่แตะแถว QR ของนักเรียน)
        const sectionId = String(payload?.section_id ?? "");
        if (!(await ownsSection(supabase, teacherId, sectionId))) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("student_code", String(payload?.student_code ?? ""))
          .eq("section_id", sectionId)
          .eq("date", String(payload?.date ?? ""))
          .eq("method", "teacher");
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
