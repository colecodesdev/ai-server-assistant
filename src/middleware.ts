import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 8 hours in milliseconds — hard session timeout for staff/admin
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/**
 * Middleware: runs on every matched route.
 *
 * - Refreshes the Supabase session (keeps cookies alive)
 * - Enforces session timeout (8-hour max)
 * - Protects /staff and /admin routes (redirect to login if unauthenticated)
 * - Enforces role-based access (admin routes require admin role)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session — important for keeping the session alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Session timeout ─────────────────────────────────────
  if (user) {
    const sessionStart = request.cookies.get("session_start")?.value;
    if (sessionStart) {
      const elapsed = Date.now() - Number(sessionStart);
      if (elapsed > SESSION_MAX_AGE_MS) {
        // Session expired — sign out and redirect to login
        await supabase.auth.signOut();
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("expired", "1");
        const expiredResponse = NextResponse.redirect(loginUrl);
        expiredResponse.cookies.delete("session_start");
        return expiredResponse;
      }
    }
  }

  // ── Protected routes ──────────────────────────────────────
  const isStaffRoute = pathname.startsWith("/staff");
  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname.startsWith("/portal");
  const isProtected = isStaffRoute || isAdminRoute || isPortalRoute;

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based access ─────────────────────────────────────
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // Admin routes require admin role
    if (isAdminRoute && role !== "admin") {
      // Staff trying to access admin → redirect to staff page
      if (role === "staff") {
        return NextResponse.redirect(new URL("/staff", request.url));
      }
      // No role at all → back to login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Staff routes require staff or admin role
    if (isStaffRoute && !role) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // ── Redirect authenticated users away from login ──────────
  if (pathname === "/auth/login" && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const dest = profile?.role === "admin" ? "/admin" : "/staff";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public folder files (svg, png, jpg, etc.)
     * - API routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
