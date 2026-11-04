import crypto from 'node:crypto';

const NATIONAL_CODE_PATTERN = /^\d{10}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_ATTEMPTS_PER_SUBMISSION = 500;

const isValidNationalCode = (value: unknown): value is string =>
  typeof value === 'string' &&
  NATIONAL_CODE_PATTERN.test(value.trim()) &&
  !/^(\d)\1{9}$/.test(value.trim());

const clean = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

/** پاسخ خطای یکدست برای این کنترلر */
const fail = (ctx: any, status: number, message: string) =>
  ctx.throw(status, message, { code: 'STUDENT_AUTH_ERROR' });

export default {
  /** ثبت‌نام دانش‌آموز با کد ملی */
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

    const service = strapi.service('api::student.student');
    const existing = await service.findByNationalCode(nationalCode);

    if (existing) {
      return fail(ctx, 409, 'این کد ملی قبلاً ثبت‌نام کرده است. از فرم ورود استفاده کنید.');
    }

    const { hash, salt } = service.hashPassword(password);

    let student;
    try {
      student = await strapi.documents('api::student.student').create({
        data: {
          fullName,
          studentClass,
          nationalCode,
          passwordHash: hash,
          passwordSalt: salt,
          lastLoginAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      // ایندکس یکتای کد ملی در دیتابیس جلوی ثبت هم‌زمان را می‌گیرد
      if (String(error?.message || '').toLowerCase().includes('unique')) {
        return fail(ctx, 409, 'این کد ملی قبلاً ثبت‌نام کرده است.');
      }
      strapi.log.error('خطا در ثبت‌نام دانش‌آموز:', error);
      return fail(ctx, 500, 'ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید.');
    }

    return ctx.send({
      token: service.issueToken(student),
      student: publicStudent(student),
    });
  },

  /** ورود دانش‌آموز */
  async login(ctx: any) {
    const body = (ctx.request.body || {}) as Record<string, unknown>;
    const nationalCode = typeof body.nationalCode === 'string' ? body.nationalCode.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isValidNationalCode(nationalCode) || password.length === 0) {
      return fail(ctx, 400, 'کد ملی (۱۰ رقم) و رمز عبور را کامل وارد کنید.');
    }

    const service = strapi.service('api::student.student');
    const student = await service.findByNationalCode(nationalCode);

    // پیام یکسان برای «کاربر ناموجود» و «رمز غلط» تا نشود کدهای ملی را شمارش کرد
    const genericError = 'کد ملی یا رمز عبور اشتباه است.';

    if (!student) {
      // محاسبه‌ی ساختگی برای هم‌زمان‌سازی پاسخ‌ها و جلوگیری از افشای زمان‌بندی
      crypto.scryptSync(password, 'dummy-salt-for-timing', 64);
      return fail(ctx, 401, genericError);
    }

    if (!service.verifyPassword(password, student.passwordHash, student.passwordSalt)) {
      return fail(ctx, 401, genericError);
    }

    await strapi.db.query('api::student.student').update({
      where: { id: student.id },
      data: { lastLoginAt: new Date().toISOString() },
    });

    return ctx.send({
      token: service.issueToken(student),
      student: publicStudent(student),
    });
  },

  /** پروفایل دانش‌آموز + همه‌ی کارنامه‌های خودش */
  async me(ctx: any) {
    const service = strapi.service('api::student.student');
    const payload = service.readTokenFromContext(ctx);

    if (!payload) {
      return fail(ctx, 401, 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
    }

    const student = await strapi.db.query('api::student.student').findOne({
      where: { nationalCode: payload.nc },
    });

    if (!student) {
      return fail(ctx, 401, 'حساب دانش‌آموزی یافت نشد.');
    }

    const submissions = await strapi.documents('api::submission.submission').findMany({
      filters: { nationalCode: { $eq: student.nationalCode } },
      populate: { quiz: { fields: ['title', 'durationMinutes', 'documentId'] } },
      status: 'published',
      sort: ['createdAt:desc'],
      limit: MAX_ATTEMPTS_PER_SUBMISSION,
    });

    const attempts = submissions.map((submission: any) => shapeSubmission(submission));

    const percentages = attempts.map((item) => item.percentage);

    return ctx.send({
      student: publicStudent(student),
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

function publicStudent(student: any) {
  return {
    documentId: student.documentId,
    fullName: student.fullName,
    studentClass: student.studentClass,
    nationalCode: student.nationalCode,
  };
}

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
      selectedOption: detail.selectedOption ?? null,
      correctAnswer: detail.correctAnswer ?? null,
      isCorrect: Boolean(detail.isCorrect),
      weight: Number(detail.weight) || 1,
    })),
  };
}
