import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    // Top-level fail-safe timeout guard (1500ms) to ensure Vercel Edge 504 is never triggered
    const timeoutPromise = new Promise<NextResponse>((resolve) => {
      setTimeout(() => {
        console.warn("[Droppr Middleware] Top-level safety timeout triggered, passing request through.");
        resolve(NextResponse.next({ request }));
      }, 1500);
    });

    return await Promise.race([updateSession(request), timeoutPromise]);
  } catch (err: any) {
    console.error("[Droppr Middleware Error]:", err);
    // If middleware encounters an error, don't crash with 500/504 — pass request through
    const response = NextResponse.next({ request });
    response.headers.set("x-middleware-error", String(err?.message || err));
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api routes (/api/*) — API routes manage their own authentication
     * - static assets: fonts, images, icons, manifests, and text documents
     */
    "/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map|txt|xml|json|webmanifest)$).*)",
  ],
};
