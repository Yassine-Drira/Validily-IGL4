import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { findOrphanAuthCookies } from "@/lib/auth/cookie-utils";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname.startsWith("/forest") ||
    pathname.startsWith("/my-space") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/bookmarks");

  let authenticatedUser = null;

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder-project")
  ) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieEncoding: "base64url",
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "lax",
              path: "/",
            })
          );
        },
      },
    });

    // Refresh auth session
    const { data } = await supabase.auth.getUser();
    authenticatedUser = data?.user || null;

    // Actively delete any orphaned auth chunks from earlier sessions to eliminate HTTP 431
    const allCookies = request.cookies.getAll();
    const orphans = findOrphanAuthCookies(allCookies);
    for (const orphan of orphans) {
      response.cookies.delete(orphan);
    }
  }

  // Mandatory Authentication: Protect features from unlogged visitors
  if (isProtectedRoute && !authenticatedUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)",
  ],
};
