import { NextRequest, NextResponse } from "next/server";
import { STRAPI_INTERNAL_URL } from "@/lib/student-api";
import {
  AUTH_COOKIES,
  accessCookieOptions,
  isTokenUsable,
  refreshAccessToken,
  refreshCookieOptions,
  type AuthKind,
} from "@/lib/auth";

/**
 * پروکسی سمت سرور به استراپی.
 *
 * - مرورگر هرگز مستقیماً با Strapi صحبت نمی‌کند (نه localhost و نه 127.0.0.1).
 * - اگر هدر Authorization نباشد، توکنِ داخل کوکی httpOnly (دبیر یا دانش‌آموز)
 *   به‌صورت Bearer منتقل می‌شود؛ بنابراین توکن هرگز در دسترس جاوااسکریپت نیست.
 * - اگر توکن دسترسی منقضی شده باشد، به‌صورت شفاف با توکن تازه‌سازی تمدید
 *   و همان درخواست تکرار می‌شود.
 */

const FORWARDED_HEADERS = ["authorization", "content-type", "accept"];

const performRequest = (
  targetUrl: string,
  method: string,
  headers: Headers,
  body?: ArrayBuffer
) =>
  fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  // بعضی بخش‌ها مسیر را با «/api» صدا می‌زنند (`/api/strapi/api/quizzes`).
  // استراپی خودش پیشوند /api را دارد، پس اگر تکراری بود همان‌جا حذفش می‌کنیم.
  const segments = path[0] === "api" ? path.slice(1) : path;

  const targetUrl = `${STRAPI_INTERNAL_URL}/api/${segments
    .map((segment) => encodeURIComponent(segment))
    .join("/")}${request.nextUrl.search}`;

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD", "OPTIONS"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const headers = new Headers();
  for (const header of FORWARDED_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");

  // IP واقعی مرورگر را منتقل می‌کنیم تا محدودیت نرخ بین کاربران مشترک نشود
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  // ---------- تعیین منبع احراز هویت ----------
  let activeKind: AuthKind | null = null;
  let rotatedSession: { token: string; refresh?: string; sig?: string } | null = null;

  if (!headers.has("authorization")) {
    // دبیر اولویت دارد؛ سپس دانش‌آموز
    const candidates: AuthKind[] = ["teacher", "student"];

    for (const kind of candidates) {
      const names = AUTH_COOKIES[kind];
      const accessToken = request.cookies.get(names.access)?.value;
      const refreshToken = request.cookies.get(names.refresh)?.value;
      const refreshSig = request.cookies.get(names.sig)?.value;

      if (!accessToken && !refreshToken) continue;

      activeKind = kind;

      if (!isTokenUsable(accessToken)) {
        rotatedSession = await refreshAccessToken(refreshToken, refreshSig);
      }

      const effective = rotatedSession?.token ?? accessToken;
      if (effective) headers.set("authorization", `Bearer ${effective}`);

      break;
    }
  }

  const buildResponse = async (upstream: Response) => {
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });

    if (rotatedSession && activeKind) {
      const names = AUTH_COOKIES[activeKind];

      response.cookies.set(names.access, rotatedSession.token, accessCookieOptions);

      if (rotatedSession.refresh && rotatedSession.sig) {
        response.cookies.set(names.refresh, rotatedSession.refresh, refreshCookieOptions);
        response.cookies.set(names.sig, rotatedSession.sig, refreshCookieOptions);
      }
    }

    // نشست واقعاً از کار افتاده → کوکی‌ها پاک می‌شوند تا کاربر دوباره وارد شود
    if (upstream.status === 401 && activeKind) {
      const names = AUTH_COOKIES[activeKind];

      for (const name of [names.access, names.refresh, names.sig]) {
        response.cookies.set(name, "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      }
    }

    return response;
  };

  try {
    let upstream = await performRequest(targetUrl, method, headers, body);

    // اگر با وجود توکن معتبر ۴۰۱ گرفتیم، یک بار تازه‌سازی و تکرار می‌کنیم
    if (upstream.status === 401 && activeKind && !rotatedSession) {
      const names = AUTH_COOKIES[activeKind];
      const retry = await refreshAccessToken(
        request.cookies.get(names.refresh)?.value,
        request.cookies.get(names.sig)?.value
      );

      if (retry) {
        rotatedSession = retry;
        headers.set("authorization", `Bearer ${retry.token}`);
        upstream = await performRequest(targetUrl, method, headers, body);
      }
    }

    return await buildResponse(upstream);
  } catch {
    return NextResponse.json(
      {
        error: {
          status: 503,
          name: "ServiceUnavailable",
          message:
            "ارتباط با سرور آزمون برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.",
        },
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
