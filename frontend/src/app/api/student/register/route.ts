import { NextRequest, NextResponse } from "next/server";
import {
  STUDENT_COOKIE_MAX_AGE,
  STUDENT_COOKIE_NAME,
  extractErrorMessage,
  requestStudentApi,
} from "@/lib/student-api";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: STUDENT_COOKIE_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const { ok, status, data } = await requestStudentApi("register", {
    method: "POST",
    body: JSON.stringify({
      fullName: body?.fullName,
      studentClass: body?.studentClass,
      nationalCode: body?.nationalCode,
      password: body?.password,
    }),
  });

  if (!ok || !data?.token) {
    return NextResponse.json(
      {
        error: {
          message: extractErrorMessage(data, "ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید."),
        },
      },
      { status }
    );
  }

  const response = NextResponse.json({ student: data.student });
  response.cookies.set(STUDENT_COOKIE_NAME, data.token, cookieOptions);
  return response;
}
