import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function slugifyFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "file"}${ext}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: teacher } = await supabase.from("teachers").select("id").eq("id", user.id).single();
  if (!teacher) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const taskId = String(form.get("task_id") ?? "").trim();
  const remove = form.get("remove") === "1";
  const file = form.get("file") as File | null;

  if (!taskId) return NextResponse.json({ error: "missing task_id" }, { status: 400 });
  if (!remove && !file) return NextResponse.json({ error: "missing file" }, { status: 400 });

  const svc = serviceClient();

  const { data: task } = await svc.from("tasks").select("id, subject_id, file_url").eq("id", taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });

  // เช็คว่าครูคนนี้สอนวิชานี้จริง
  const { data: link } = await svc
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", task.subject_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "คุณไม่ได้สอนวิชานี้" }, { status: 403 });

  if (remove) {
    if (task.file_url) await svc.storage.from("submissions").remove([task.file_url]);
    const { error } = await svc.from("tasks").update({ file_url: null, file_name: null }).eq("id", taskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const path = `task-files/${taskId}/${slugifyFileName(file!.name)}`;
  const buffer = Buffer.from(await file!.arrayBuffer());
  const { error: uploadError } = await svc.storage
    .from("submissions")
    .upload(path, buffer, { upsert: true, contentType: file!.type || undefined });
  if (uploadError) return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ: " + uploadError.message }, { status: 500 });

  // ไฟล์เดิมชื่อไม่ตรงกับไฟล์ใหม่ (เปลี่ยนชื่อไฟล์) → ลบไฟล์เดิมทิ้ง กันขยะค้าง storage
  if (task.file_url && task.file_url !== path) {
    await svc.storage.from("submissions").remove([task.file_url]);
  }

  const { error: updateError } = await svc
    .from("tasks")
    .update({ file_url: path, file_name: file!.name })
    .eq("id", taskId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
