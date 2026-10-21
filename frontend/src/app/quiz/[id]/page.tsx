import { notFound } from "next/navigation";
import { getQuizById } from "@/lib/api";
import QuizRunner from "@/components/QuizRunner";

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;

  let quiz = null;
  try {
    quiz = await getQuizById(id);
  } catch (error) {
    console.error("Failed to load quiz:", error);
  }

  if (!quiz) {
    notFound();
  }

  return <QuizRunner quiz={quiz} />;
}
