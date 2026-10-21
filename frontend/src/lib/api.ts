import { Quiz, SubmissionPayload, SubmissionResponse } from "@/types/quiz";

const STRAPI_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";

export async function getQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${STRAPI_BASE_URL}/api/quizzes?populate=*`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("خطا در دریافت لیست آزمون‌ها از سرور");
  }

  const json = await res.json();
  return json.data || [];
}

export async function getQuizById(id: string | number): Promise<Quiz | null> {
  const res = await fetch(
    `${STRAPI_BASE_URL}/api/quizzes/${id}?populate[questions][populate]=*`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("خطا در دریافت مشخصات آزمون");
  }

  const json = await res.json();
  return json.data || null;
}

export async function submitQuizAnswers(
  payload: SubmissionPayload
): Promise<SubmissionResponse> {
  const res = await fetch(`${STRAPI_BASE_URL}/api/quizzes/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || "خطا در ثبت و تصحیح آزمون در سرور"
    );
  }

  return res.json();
}
