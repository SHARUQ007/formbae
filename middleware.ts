import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("form_bae_session")?.value;
  const path = request.nextUrl.pathname;

  const isPrivate = path.startsWith("/trainer") || path.startsWith("/app") || path.startsWith("/admin");
  if (isPrivate && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/trainer/:path*", "/app/:path*", "/admin/:path*"]
};
