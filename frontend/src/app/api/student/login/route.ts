import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  accessCookieOptions,
  refreshCookieOptions,
  signIn,
  userCookieOptions,
} from "@/lib/auth";

const STUDENT = AUTH_COOKIES.student;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const nationalCode =
    typeof body?.nationalCode === "string" ? body.nationalCode.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^\d{10}$/.test(nationalCode) || password.length === 0) {
    return NextResponse.json(
      { error: { message: "کد ملی (۱۰ رقم) و رمز عبور را کامل وارد کنید." } },
      { status: 400 }
    );
  }

  const result = await signIn(nationalCode, password);

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: "کد ملی یا رمز عبور اشتباه است." } },
      { status: result.status === 200 ? 401 : result.status }
    );
  }

  const { user, token, refresh, sig } = result.tokens;

  // حساب دبیر نباید از فرم دانش‌آموزی وارد شود
  if (!user.nationalCode) {
    return NextResponse.json(
      {
        error: {
          message: "این حساب مربوط به دبیر است؛ از پنل دبیر وارد شوید.",
        },
      },
      { status: 403 }
    );
  }

  const profile = {
    documentId: user.documentId,
    fullName: user.fullName || user.username,
    studentClass: user.studentClass || "-",
    nationalCode: user.nationalCode,
  };

  const response = NextResponse.json({ student: profile });

  response.cookies.set(STUDENT.access, token, accessCookieOptions);
  response.cookies.set(STUDENT.user, JSON.stringify(profile), userCookieOptions);

  if (refresh && sig) {
    response.cookies.set(STUDENT.refresh, refresh, refreshCookieOptions);
    response.cookies.set(STUDENT.sig, sig, refreshCookieOptions);
  }

  return response;
}
