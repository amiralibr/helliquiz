/**
 * حساب دانش‌آموز روی همان مدل کاربرِ users-permissions ساخته می‌شود تا
 * مدیریت کاربران (نقش، مسدودسازی، بازنشانی رمز) همه از پنل استراپی انجام شود.
 *
 * نقش‌ها:
 *   - Student       → دانش‌آموزان (دسترسی محتوایی ندارد)
 *   - Authenticated → دبیران
 */

const USER_UID = 'plugin::users-permissions.user';
const STUDENT_ROLE_TYPE = 'student';
const NATIONAL_CODE_PATTERN = /^\d{10}$/;
const MIN_PASSWORD_LENGTH = 8;
const STUDENT_EMAIL_DOMAIN = 'student.helliquiz.local';
const MAX_ATTEMPTS_PER_SUBMISSION = 500;

const isValidNationalCode = (value: unknown): value is string =>
  typeof value === 'string' &&
  NATIONAL_CODE_PATTERN.test(value.trim()) &&
  !/^(\d)\1{9}$/.test(value.trim());

const clean = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const fail = (ctx: any, status: number, message: string) =>
  ctx.throw(status, message, { code: 'STUDENT_AUTH_ERROR' });

/** نقش دانش‌آموز را برمی‌گرداند و در صورت نبودن می‌سازد */
const getStudentRole = async (strapi: any) => {
  const roles = strapi.plugin('users-permissions').service('role') as any;

  let role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: STUDENT_ROLE_TYPE } });

  if (!role) {
    role = await roles.create({
      name: 'Student',
      description: 'دانش‌آموز — فقط کارنامه‌ی خودش را می‌بیند',
      type: STUDENT_ROLE_TYPE,
    });
  }

  return role;
};

export default {
  /** POST /api/student-auth/register — ساخت حساب دانش‌آموز */
  async register(ctx: any) {
    const body = (ctx.request.body || {}) as Record<string, unknown>;

    const fullName = clean(body.fullName, 80);
    const studentClass = clean(body.studentClass, 40);
    const nationalCode = typeof body.nationalCode === 'string' ? body.nationalCode.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (fullName.length < 3) {
      return fail(ctx, 400, 'نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
    }
    if (studentClass.length < 1) {
      return fail(ctx, 400, 'کلاس / پایه را وارد کنید.');
    }
    if (!isValidNationalCode(nationalCode)) {
      return fail(ctx, 400, 'کد ملی باید دقیقاً ۱۰ رقم و معتبر باشد.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(ctx, 400, `رمز عبور باید دست‌کم ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
    }

    const existing = await strapi.db.query(USER_UID).findOne({
      where: {
        $or: [
          { nationalCode },
          { username: nationalCode },
          { email: `${nationalCode}@${STUDENT_EMAIL_DOMAIN}` },
        ],
      },
    });

    if (existing) {
      return fail(ctx, 409, 'این کد ملی قبلاً ثبت‌نام کرده است. از فرم ورود استفاده کنید.');
    }

    const role = await getStudentRole(strapi);

    let user;
    try {
      user = await strapi.plugin('users-permissions').service('user').add({
        username: nationalCode,
        email: `${nationalCode}@${STUDENT_EMAIL_DOMAIN}`,
        password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: role.id,
        fullName,
        studentClass,
        nationalCode,
      });
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('unique')) {
        return fail(ctx, 409, 'این کد ملی قبلاً ثبت‌نام کرده است.');
      }
      strapi.log.error('خطا در ثبت‌نام دانش‌آموز:', error);
      return fail(ctx, 500, 'ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید.');
    }

    return ctx.send({
      user: {
        documentId: user.documentId,
        fullName: user.fullName,
        studentClass: user.studentClass,
        nationalCode: user.nationalCode,
      },
    });
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
      status: 'published',
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
