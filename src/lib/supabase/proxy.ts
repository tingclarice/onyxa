import "server-only";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, getSupabaseConfig, type SupabaseDatabase } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const responseCookies: Parameters<SetAllCookies>[0] = [];
  const responseHeaders: Record<string, string> = { "Cache-Control": "private, no-store" };
  if (request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))) {
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createServerClient<SupabaseDatabase>(url, publishableKey, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          responseCookies.push(...cookiesToSet);
          Object.assign(responseHeaders, headers);
        },
      },
    });
    await supabase.auth.getClaims();
  }
  const response = NextResponse.next({ request });
  responseCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(responseHeaders).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}
