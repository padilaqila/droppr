import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

interface JwtPayload {
  exp?: number;
  sub?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Combines chunked cookies (sb-*-auth-token.0, .1) or retrieves single auth cookie.
 */
function getCombinedAuthCookie(request: NextRequest): string {
  const allCookies = request.cookies.getAll();
  const authCookies = allCookies.filter(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
  );

  if (authCookies.length === 0) return "";

  // Direct unchunked cookie
  const direct = authCookies.find((c) => !/\.\d+$/.test(c.name));
  if (direct?.value) return direct.value;

  // Chunked cookies (.0, .1, .2, ...)
  authCookies.sort((a, b) => {
    const idxA = parseInt(a.name.split(".").pop() || "0", 10);
    const idxB = parseInt(b.name.split(".").pop() || "0", 10);
    return idxA - idxB;
  });

  return authCookies.map((c) => c.value).join("");
}

/**
 * Safely parses JWT payload directly from Supabase auth cookie in 0ms (Edge Runtime safe).
 */
function extractJwtPayload(rawCookie: string): JwtPayload | null {
  if (!rawCookie) return null;

  let raw = rawCookie;
  // Supabase SSR prefixes stored cookies with "base64-"
  if (raw.startsWith("base64-")) {
    try {
      let b64 = raw.slice(7).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      raw = atob(b64);
    } catch {
      return null;
    }
  }

  let jwtString = "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      jwtString = parsed[0];
    } else if (parsed && typeof parsed === "object") {
      jwtString = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : "");
    }
  } catch {
    if (raw.startsWith("eyJ")) {
      jwtString = raw;
    }
  }

  if (!jwtString || !jwtString.includes(".")) return null;

  try {
    const parts = jwtString.split(".");
    if (parts.length < 2) return null;
    let b64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64Payload.length % 4) b64Payload += "=";
    const jsonStr = atob(b64Payload);
    return JSON.parse(jsonStr) as JwtPayload;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Protected app routes
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

  // Non-app and non-auth routes (marketing, public, etc.) don't require middleware auth checks
  if (!isAppRoute && !isAuthRoute) {
    return supabaseResponse;
  }

  // Fast path: Check if auth cookies exist
  const combinedAuthCookie = getCombinedAuthCookie(request);
  const hasAuthCookie = Boolean(combinedAuthCookie);

  // If visiting a protected app route and no auth cookie exists, redirect immediately (0ms)
  if (isAppRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If visiting auth routes without cookie, allow access (0ms)
  if (isAuthRoute && !hasAuthCookie) {
    return supabaseResponse;
  }

  // Client-side RSC & Prefetch optimization: pass through if cookies exist (0ms)
  const isClientNav =
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    Boolean(request.headers.get("accept")?.includes("text/x-component"));

  if (isClientNav && hasAuthCookie) {
    return supabaseResponse;
  }

  // ZERO-LATENCY JWT FAST-PATH:
  // Inspect the JWT expiration in memory. If valid for >= 60 seconds, no remote fetch is needed!
  const jwtPayload = extractJwtPayload(combinedAuthCookie);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isTokenValid = Boolean(
    jwtPayload?.exp && jwtPayload.exp > nowSeconds + 60
  );

  if (isTokenValid) {
    // Valid session:
    // If accessing /login or /register, redirect to /dashboard immediately
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // If accessing protected app route, pass through immediately with 0ms network latency
    return supabaseResponse;
  }

  // If token is missing, expired, or near-expiry, refresh session via Supabase with HARD TIMEOUT GUARD (1200ms)
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

  try {
    // 1200ms hard timeout guard to prevent Vercel 504 Edge Middleware Timeout
    const getUserPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{
      data: { user: null };
      error: Error;
      isTimeout: boolean;
    }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: { user: null },
            error: new Error("Supabase auth timeout in edge middleware"),
            isTimeout: true,
          }),
        1200
      )
    );

    const result = await Promise.race([
      getUserPromise.then((res) => ({ ...res, isTimeout: false })),
      timeoutPromise,
    ]);

    if (result.isTimeout) {
      console.warn(
        "[Droppr Middleware] Supabase getUser timed out. Passing through to application layer."
      );
      // Fallback: If user had an auth cookie, pass through to let Node.js Server Component handle it
      return supabaseResponse;
    }

    const user = result.data?.user;

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
  } catch (err) {
    console.error("[Droppr Middleware] Auth check error:", err);
    // On unexpected error, pass through for authenticated users rather than breaking with 500/504
    if (hasAuthCookie) {
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}
