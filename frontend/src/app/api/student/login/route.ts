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

  const { ok, status, data } = await requestStudentApi("login", {
    method: "POST",
    body: JSON.stringify({
      nationalCode: body?.nationalCode,
      password: body?.password,
    }),
  });

  if (!ok || !data?.token) {
    return NextResponse.json(
      {
        error: {
          message: extractErrorMessage(data, "کد ملی یا رمز عبور اشتباه است."),
        },
      },
      { status: status === 200 ? 401 : status }
    );
  }

  const response = NextResponse.json({ student: data.student });
  response.cookies.set(STUDENT_COOKIE_NAME, data.token, cookieOptions);
  return response;
}
