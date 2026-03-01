import { NextResponse } from "next/server";

const AUTH_COOKIE = "lmt_token";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
};
