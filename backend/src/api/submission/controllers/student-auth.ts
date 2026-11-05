/**
 * حساب دانش‌آموز روی همان مدل کاربرِ users-permissions ساخته می‌شود تا
 * مدیریت کاربران (نقش، مسدودسازی، بازنشانی رمز) همه از پنل استراپی انجام شود.
 *
 * نقش‌ها:
 *   - Student       → دانش‌آموزان (دسترسی محتوایی ندارد)
 *   - Authenticated → دبیران
 */

import { USER_UID, createStudentAccount } from '../../../utils/student-account';

const MAX_ATTEMPTS_PER_SUBMISSION = 500;

const fail = (ctx: any, status: number, message: string) =>
  ctx.throw(status, message, { code: 'STUDENT_AUTH_ERROR' });

export default {
  /** POST /api/student-auth/register — ساخت حساب دانش‌آموز */
  async register(ctx: any) {
    const body = (ctx.request.body || {}) as Record<string, unknown>;

    try {
      const student = await createStudentAccount(strapi, {
        fullName: body.fullName,
        studentClass: body.studentClass,
        nationalCode: body.nationalCode,
        password: body.password,
      });

      return ctx.send({
        user: {
          documentId: student.documentId,
          fullName: student.fullName,
          studentClass: student.studentClass,
          nationalCode: student.nationalCode,
        },
      });
    } catch (error: any) {
      const status = Number(error?.status) || 500;
      return fail(
        ctx,
        status,
        status === 500
          ? 'ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید.'
          : error.message
      );
    }
  },

  /** GET /api/student-auth/me — پروفایل و کارنامه‌های خودِ دانش‌آموز */
  async me(ctx: any) {
    const header = String(ctx.request.header.authorization || '');
    if (!header.toLowerCase().startsWith('bearer ')) {
      return fail(ctx, 401, 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
    }

    let payload: any;
    try {
      payload = await strapi
        .plugin('users-permissions')
        .service('jwt')
        .verify(header.slice(7).trim());
    } catch {
      return fail(ctx, 401, 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
    }

    const user: any = await strapi.db.query(USER_UID).findOne({
      where: { id: payload?.id },
      populate: ['role'],
    });

    if (!user || user.blocked) {
      return fail(ctx, 401, 'حساب کاربری در دسترس نیست.');
    }

    if (!user.nationalCode) {
      return fail(ctx, 403, 'این حساب به یک دانش‌آموز متصل نیست.');
    }

    const submissions = await strapi.documents('api::submission.submission').findMany({
      filters: { nationalCode: { $eq: user.nationalCode } },
      populate: { quiz: { fields: ['title', 'durationMinutes', 'documentId'] } },
      sort: ['createdAt:desc'],
      limit: MAX_ATTEMPTS_PER_SUBMISSION,
    });

    const attempts = submissions.map((submission: any) => shapeSubmission(submission));
    const percentages = attempts.map((item) => item.percentage);

    return ctx.send({
      student: {
        documentId: user.documentId,
        fullName: user.fullName || user.username,
        studentClass: user.studentClass || '-',
        nationalCode: user.nationalCode,
      },
      attempts,
      stats: {
        attempts: attempts.length,
        averagePercentage:
          percentages.length > 0
            ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
            : 0,
        bestPercentage: percentages.length > 0 ? Math.max(...percentages) : 0,
        totalTimeSpentSeconds: attempts.reduce((sum, item) => sum + item.timeSpentSeconds, 0),
      },
    });
  },
};

/** یک رکورد سابمیشن را به شکل امن و قابل‌مصرف برای پنل دانش‌آموز تبدیل می‌کند */
function shapeSubmission(submission: any) {
  const answers = submission.answers || {};
  const details = Array.isArray(answers.details) ? answers.details : [];

  const percentage =
    typeof answers.percentage === 'number'
      ? answers.percentage
      : typeof submission.score === 'number'
        ? submission.score
        : 0;

  return {
    documentId: submission.documentId,
    createdAt: submission.createdAt,
    timeSpentSeconds: Number(submission.timeSpentSeconds) || 0,
    score: Number(submission.score) || 0,
    totalScore: Number(answers.totalScore) || 0,
    correctCount: Number(answers.correctCount) || 0,
    totalQuestions: Number(answers.totalQuestions) || details.length,
    percentage,
    quiz: {
      documentId: submission.quiz?.documentId || null,
      title: submission.quiz?.title || 'آزمون حذف‌شده',
      durationMinutes: submission.quiz?.durationMinutes ?? null,
    },
    details: details.map((detail: any) => ({
      questionText: detail.questionText || '',
      options: Array.isArray(detail.options) ? detail.options : undefined,
      selectedOption: detail.selectedOption ?? null,
      correctAnswer: detail.correctAnswer ?? null,
      isCorrect: Boolean(detail.isCorrect),
      weight: Number(detail.weight) || 1,
    })),
  };
}
