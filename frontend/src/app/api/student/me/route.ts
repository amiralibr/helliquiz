import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-session";


export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return NextResponse.json(
      { error: { message: "نشست شما معتبر نیست. لطفاً دوباره وارد شوید." } },
      { status: 401 }
    );
  }

  return NextResponse.json(session, {
    headers: { "cache-control": "no-store" },
  });
}
