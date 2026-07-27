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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: admin } = await supabase
    .from("teachers")
    .select("id, is_super_admin")
    .eq("id", user.id)
    .single();
  if (!admin?.is_super_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { teacher_id?: string; suspended?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const teacherId = (body.teacher_id ?? "").trim();
  const suspended = body.suspended;
  if (!teacherId || typeof suspended !== "boolean") {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }
  if (teacherId === admin.id) {
    return NextResponse.json({ error: "ระงับบัญชีตัวเองไม่ได้" }, { status: 400 });
  }

  const svc = serviceClient();
  const { error } = await svc.from("teachers").update({ is_suspended: suspended }).eq("id", teacherId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
