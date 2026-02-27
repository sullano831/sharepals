import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/profile"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session so middleware and server components see the same session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  const applyCookiesTo = (response: NextResponse) => {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    setCookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    return response;
  };

  if (req.nextUrl.pathname === "/") {
    const url = new URL(user ? "/dashboard" : "/login", req.url);
    return applyCookiesTo(NextResponse.redirect(url));
  }

  if (isProtected && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return applyCookiesTo(NextResponse.redirect(loginUrl));
  }

  if (
    user &&
    (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register")
  ) {
    return applyCookiesTo(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
