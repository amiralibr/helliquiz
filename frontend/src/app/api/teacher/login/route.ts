import { NextRequest, NextResponse } from "next/server";
import { STRAPI_INTERNAL_URL } from "@/lib/student-api";
import {
  TEACHER_ACCESS_COOKIE,
  TEACHER_REFRESH_COOKIE,
  TEACHER_REFRESH_SIG_COOKIE,
  TEACHER_USER_COOKIE,
  extractStrapiRefreshCookies,
  teacherAccessCookieOptions,
  teacherRefreshCookieOptions,
  teacherUserCookieOptions,
} from "@/lib/teacher-api";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  let upstream: Response;
  try {
    upstream = await fetch(`${STRAPI_INTERNAL_URL}/api/auth/local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: body?.identifier,
        password: body?.password,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: { message: "ارتباط با سرور آزمون برقرار نشد. دوباره تلاش کنید." } },
      { status: 503 }
    );
  }

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok || typeof data?.jwt !== "string" || !data.jwt) {
    return NextResponse.json(
      {
        error: {
          message:
            data?.error?.message ||
            "نام کاربری یا رمز عبور اشتباه است (یا دسترسی فعال نیست).",
        },
      },
      { status: upstream.ok ? 401 : upstream.status }
    );
  }

  const refresh = extractStrapiRefreshCookies(upstream.headers);
  const user = {
    username: data?.user?.username,
    email: data?.user?.email,
  };

  const response = NextResponse.json({ user });

  response.cookies.set(TEACHER_ACCESS_COOKIE, data.jwt, teacherAccessCookieOptions);
  response.cookies.set(TEACHER_USER_COOKIE, JSON.stringify(user), teacherUserCookieOptions);

  if (refresh.value && refresh.sig) {
    response.cookies.set(TEACHER_REFRESH_COOKIE, refresh.value, teacherRefreshCookieOptions);
    response.cookies.set(TEACHER_REFRESH_SIG_COOKIE, refresh.sig, teacherRefreshCookieOptions);
  }

  return response;
}
