import { getQuizzes } from "@/lib/api";
import { getStudentSession } from "@/lib/student-session";
import StudentAuth from "@/components/student/StudentAuth";
import StudentDashboard from "@/components/student/StudentDashboard";


export const instant = false;

export const metadata = {
  title: "پنل دانش‌آموز | HelliQuiz",
  description: "کارنامه‌ها، درصدها و پاسخ‌نامه‌ی تفکیکی آزمون‌های دانش‌آموز",
};

export default async function StudentPage() {
  const session = await getStudentSession();

  if (!session) {
    return <StudentAuth />;
  }

  const quizzes = await getQuizzes().catch(() => []);

  return <StudentDashboard session={session} quizzes={quizzes} />;
}
