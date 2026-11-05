import { Quiz } from "@/types/quiz";

/**
 * واکشی داده در سمت سرور (Server Components).
 * استراپی روی همان ماشین اجرا می‌شود، بنابراین آدرس داخلی امن است و هیچ
 * درخواستی از مرورگر به localhost زده نمی‌شود.
 */
const STRAPI_BASE_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://127.0.0.1:1337";

export async function getQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${STRAPI_BASE_URL}/api/quiz-public`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("خطا در دریافت لیست آزمون‌ها از سرور");
  }

  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function getQuizById(id: string | number): Promise<Quiz | null> {
  const res = await fetch(
    `${STRAPI_BASE_URL}/api/quiz-public/${encodeURIComponent(String(id))}`,
    { cache: "no-store" }
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error("خطا در دریافت مشخصات آزمون");
  }

  const json = await res.json();
  return json.data || null;
}
