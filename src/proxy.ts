import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

const PUBLIC_PATHS = ["/login", "/auth/"];

/** Saved choice first, then the browser's preferred language. */
function pickLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  return /(^|,)\s*bg\b/i.test(accepted) ? "bg" : DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Pages live under app/[lang]; rewrite so URLs stay free of a language prefix.
  const rewriteUrl = request.nextUrl.clone();
  const locale = pickLocale(request);
  if (!pathname.startsWith("/auth/")) {
    rewriteUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  }
  // Server Actions only see the cookie, so remember the language picked from the browser too.
  const rememberLocale = (res: NextResponse) => {
    if (!request.cookies.has(LOCALE_COOKIE)) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    }
    return res;
  };
  const next = () => NextResponse.rewrite(rewriteUrl, { request });

  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Refreshes the session cookie if needed. Must run before any redirect.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return rememberLocale(NextResponse.redirect(url));
  }

  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return rememberLocale(NextResponse.redirect(url));
  }

  return rememberLocale(response);
}

export const config = {
  matcher: [
    // Everything except static files, icons and the manifest.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|icons/|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|webp)$).*)",
  ],
};
