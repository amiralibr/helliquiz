import { NextRequest, NextResponse } from "next/server";
import { STUDENT_COOKIE_NAME, STRAPI_INTERNAL_URL } from "@/lib/student-api";
import {
  TEACHER_ACCESS_COOKIE,
  TEACHER_REFRESH_COOKIE,
  TEACHER_REFRESH_SIG_COOKIE,
  isTeacherTokenUsable,
  refreshTeacherAccessToken,
  teacherAccessCookieOptions,
  teacherRefreshCookieOptions,
} from "@/lib/teacher-api";

/**
 * پروکسی سمت سرور به استراپی.
 *
 * - مرورگر هرگز مستقیماً با Strapi صحبت نمی‌کند (نه localhost و نه 127.0.0.1).
 * - اگر هدر Authorization نباشد، توکنِ داخل کوکی httpOnly (دبیر یا دانش‌آموز)
 *   به‌صورت Bearer منتقل می‌شود؛ بنابراین توکن هرگز در دسترس جاوااسکریپت نیست.
 * - با ۴۰۱ شدنِ نشست دبیر، توکن دسترسی به‌صورت شفاف تازه‌سازی و درخواست تکرار می‌شود.
 */

const FORWARDED_HEADERS = ["authorization", "content-type", "accept"];

type AuthSource = "header" | "teacher" | "student" | "none";

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

  const targetUrl = `${STRAPI_INTERNAL_URL}/api/${path
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
  let authSource: AuthSource = "none";
  const refreshToken = request.cookies.get(TEACHER_REFRESH_COOKIE)?.value;
  const refreshSig = request.cookies.get(TEACHER_REFRESH_SIG_COOKIE)?.value;

  let rotatedSession: { token: string; refresh?: string; sig?: string } | null = null;

  if (headers.has("authorization")) {
    authSource = "header";
  } else {
    const teacherToken = request.cookies.get(TEACHER_ACCESS_COOKIE)?.value;
    const studentToken = request.cookies.get(STUDENT_COOKIE_NAME)?.value;

    if (teacherToken || refreshToken) {
      authSource = "teacher";

      // اگر توکن دسترسی منقضی/ناقص است، پیش از ارسال تازه‌سازی می‌کنیم
      if (!isTeacherTokenUsable(teacherToken)) {
        rotatedSession = await refreshTeacherAccessToken(refreshToken, refreshSig);
      }

      const accessToken = rotatedSession?.token ?? teacherToken;
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    } else if (studentToken) {
      headers.set("authorization", `Bearer ${studentToken}`);
      authSource = "student";
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

    if (rotatedSession) {
      response.cookies.set(
        TEACHER_ACCESS_COOKIE,
        rotatedSession.token,
        teacherAccessCookieOptions
      );

      if (rotatedSession.refresh && rotatedSession.sig) {
        response.cookies.set(
          TEACHER_REFRESH_COOKIE,
          rotatedSession.refresh,
          teacherRefreshCookieOptions
        );
        response.cookies.set(
          TEACHER_REFRESH_SIG_COOKIE,
          rotatedSession.sig,
          teacherRefreshCookieOptions
        );
      }
    }

    // نشست واقعاً از کار افتاده → کوکی‌ها پاک می‌شوند تا کاربر دوباره وارد شود
    if (upstream.status === 401 && authSource === "teacher") {
      response.cookies.set(TEACHER_ACCESS_COOKIE, "", {
        ...teacherAccessCookieOptions,
        maxAge: 0,
      });
      response.cookies.set(TEACHER_REFRESH_COOKIE, "", {
        ...teacherRefreshCookieOptions,
        maxAge: 0,
      });
      response.cookies.set(TEACHER_REFRESH_SIG_COOKIE, "", {
        ...teacherRefreshCookieOptions,
        maxAge: 0,
      });
    }

    return response;
  };

  try {
    let upstream = await performRequest(targetUrl, method, headers, body);

    // نگه‌داشتن پشتیبان: اگر با وجود توکن معتبر ۴۰۱ گرفتیم، یک بار تازه‌سازی می‌کنیم
    if (upstream.status === 401 && authSource === "teacher" && !rotatedSession) {
      const retry = await refreshTeacherAccessToken(refreshToken, refreshSig);

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
