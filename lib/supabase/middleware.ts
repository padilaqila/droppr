import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Protect app routes if user is not authenticated
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/feed") ||
    pathname.startsWith("/waitlist") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/wallets") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/settings");

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Fast path: Check if auth cookies exist
  // Supabase stores auth cookies matching pattern `sb-*-auth-token*`
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
  );

  // If visiting a protected app route and no auth cookie exists, redirect immediately
  // without incurring a remote network roundtrip to Supabase.
  if (isAppRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Next.js Router RSC & Prefetch optimization:
  // When a user is navigating between pages client-side, Next.js sends `rsc: 1`, `next-router-prefetch: 1`,
  // `purpose: prefetch`, or `accept: text/x-component`.
  // If the user already has auth cookies, pass through immediately without waiting for an
  // extra remote HTTP roundtrip to Supabase Auth on every single tab click.
  const isClientNav =
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    Boolean(request.headers.get("accept")?.includes("text/x-component"));

  if (isClientNav && hasAuthCookie) {
    return supabaseResponse;
  }

  // If visiting public/marketing routes without auth cookies, skip remote session check
  if (!isAppRoute && !isAuthRoute && !hasAuthCookie) {
    return supabaseResponse;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: CookieOptions;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
