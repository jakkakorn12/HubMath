import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    isTeacherLogin;
  const isCheckin = pathname.startsWith("/checkin") || pathname.startsWith("/reset-password");

  if (!user && !isAuthPage && !isCheckin) {
    const loginUrl = new URL(pathname.startsWith("/teacher") ? "/teacher/login" : "/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL(isTeacherLogin ? "/teacher/dashboard" : "/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
