import { NextResponse } from "next/server";
import {
  TEACHER_ACCESS_COOKIE,
  TEACHER_REFRESH_COOKIE,
  TEACHER_REFRESH_SIG_COOKIE,
  TEACHER_USER_COOKIE,
  teacherAccessCookieOptions,
  teacherRefreshCookieOptions,
  teacherUserCookieOptions,
} from "@/lib/teacher-api";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  const clearOptions = { ...teacherAccessCookieOptions, maxAge: 0 };
  response.cookies.set(TEACHER_ACCESS_COOKIE, "", clearOptions);
  response.cookies.set(TEACHER_USER_COOKIE, "", {
    ...teacherUserCookieOptions,
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

  return response;
}
