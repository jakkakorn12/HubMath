import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// หน้าที่นักเรียนใช้ (ครูไม่ควรเข้า)
const STUDENT_PATHS = ["/dashboard", "/grades", "/attendance", "/tasks", "/resources"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isTeacherLogin = pathname.startsWith("/teacher/login");
  const isTeacherArea = pathname.startsWith("/teacher") && !isTeacherLogin;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    isTeacherLogin;
  // หน้าที่จัดการ auth เอง (สแกน QR / ตั้งรหัสผ่านใหม่)
  const isSelfAuthPage = pathname.startsWith("/checkin") || pathname.startsWith("/reset-password");

  // ยังไม่ล็อกอิน → ส่งไปหน้าเข้าสู่ระบบที่ตรงกับพื้นที่
  if (!user && !isAuthPage && !isSelfAuthPage) {
    const loginUrl = new URL(isTeacherArea ? "/teacher/login" : "/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const isStudentArea = STUDENT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    // เช็ค role เฉพาะตอนที่จำเป็น (กันยิง DB ทุก request)
    if (isTeacherArea || isStudentArea || isAuthPage) {
      const { data: teacherRow } = await supabase
        .from("teachers")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      const isTeacher = !!teacherRow;

      if (isAuthPage) {
        return NextResponse.redirect(
          new URL(isTeacher ? "/teacher/dashboard" : "/dashboard", request.url)
        );
      }
      // นักเรียนพยายามเข้าพื้นที่ครู
      if (isTeacherArea && !isTeacher) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // ครูพยายามเข้าพื้นที่นักเรียน
      if (isStudentArea && isTeacher) {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
