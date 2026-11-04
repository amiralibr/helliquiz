import { Suspense } from "react";
import { getQuizzes } from "@/lib/api";
import { getStudentSession } from "@/lib/student-session";
import StudentAuth from "@/components/student/StudentAuth";
import StudentDashboard from "@/components/student/StudentDashboard";

export const metadata = {
  title: "پنل دانش‌آموز | HelliQuiz",
  description: "کارنامه‌ها، درصدها و پاسخ‌نامه‌ی تفکیکی آزمون‌های دانش‌آموز",
};

function StudentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
    </div>
  );
}

async function StudentContent() {
  const session = await getStudentSession();

  if (!session) {
    return <StudentAuth />;
  }

  const quizzes = await getQuizzes().catch(() => []);

  return <StudentDashboard session={session} quizzes={quizzes} />;
}

export default function StudentPage() {
  return (
    <Suspense fallback={<StudentSkeleton />}>
      <StudentContent />
    </Suspense>
  );
}
