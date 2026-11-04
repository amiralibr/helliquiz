import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  accessCookieOptions,
  refreshCookieOptions,
  signIn,
  userCookieOptions,
} from "@/lib/auth";

const TEACHER = AUTH_COOKIES.teacher;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const identifier =
    typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: { message: "نام کاربری و رمز عبور را وارد کنید." } },
      { status: 400 }
    );
  }

  const result = await signIn(identifier, password);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          message: "نام کاربری یا رمز عبور اشتباه است (یا دسترسی فعال نیست).",
        },
      },
      { status: result.status }
    );
  }

  const { user, token, refresh, sig } = result.tokens;

  // حساب دانش‌آموز نباید به پنل دبیر دسترسی داشته باشد
  if (user.nationalCode) {
    return NextResponse.json(
      {
        error: {
          message: "این حساب مربوط به دانش‌آموز است؛ از پنل دانش‌آموز وارد شوید.",
        },
      },
      { status: 403 }
    );
  }

  const profile = { username: user.username, email: user.email };

  const response = NextResponse.json({ user: profile });

  response.cookies.set(TEACHER.access, token, accessCookieOptions);
  response.cookies.set(TEACHER.user, JSON.stringify(profile), userCookieOptions);

  if (refresh && sig) {
    response.cookies.set(TEACHER.refresh, refresh, refreshCookieOptions);
    response.cookies.set(TEACHER.sig, sig, refreshCookieOptions);
  }

  return response;
}
