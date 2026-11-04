import { resolveStudentFromContext } from '../../../utils/student-identity';
import { factories } from '@strapi/strapi';

/* ============================================================================
 * قواعد مشترک
 * ==========================================================================*/

const NATIONAL_CODE_PATTERN = /^\d{10}$/;
const MAX_TIME_SLACK_SECONDS = 60; // تحمل خطای ساعت کلاینت

/** آیا درخواست با توکن دبیر (users-permissions) ارسال شده است؟ */
const isStaffRequest = (ctx: any): boolean => Boolean(ctx?.state?.user);

/** گزینه‌ها همیشه آرایه‌ای از رشته‌ها برگردانده می‌شوند */
const toOptionList = (options: unknown): string[] => {
  if (Array.isArray(options)) return options.map((option) => String(option));
  if (options && typeof options === 'object') {
    return Object.values(options as Record<string, unknown>).map((option) => String(option));
  }
  return [];
};

/**
 * ایندکس گزینه صحیح را به‌صورت قطعی برمی‌گرداند.
 * منبع اصلی `correctOption` است (صفر-بیس). داده‌های قدیمی که فقط
 * `correctAnswer` (یک-بیس) دارند هم پشتیبانی می‌شوند.
 */
export const resolveCorrectIndex = (
  question: Record<string, any>,
  optionCount: number
): number | null => {
  const raw = question?.correctOption;
  let index: number | null = null;

  if (raw !== null && raw !== undefined && raw !== '') {
    index = Number(raw);
  } else if (
    question?.correctAnswer !== null &&
    question?.correctAnswer !== undefined &&
    question?.correctAnswer !== ''
  ) {
    // legacy: مقادیر ۱..۴ به ایندکس ۰..۳ تبدیل می‌شوند
    const legacy = Number(question.correctAnswer);
    index = legacy >= 1 ? legacy - 1 : legacy;
  }

  if (index === null || !Number.isInteger(index)) return null;
  if (optionCount > 0 && (index < 0 || index >= optionCount)) return null;
  return index;
};

/** پاسخ صحیح فقط برای دبیر احراز هویت‌شده برگردانده می‌شود */
const stripAnswerKey = (quiz: any) => {
  if (quiz && Array.isArray(quiz.questions)) {
    quiz.questions = quiz.questions.map(
      ({ correctOption, correctAnswer, ...rest }: any) => rest
    );
  }
  return quiz;
};

/** شناسه ورودی می‌تواند documentId یا id عددی قدیمی باشد */
const findQuizWithQuestions = async (strapi: any, identifier: string) => {
  const document = await strapi.documents('api::quiz.quiz').findOne({
    documentId: identifier,
    populate: ['questions'],
    status: 'published',
  });

  if (document) return document;

  if (/^\d+$/.test(identifier)) {
    const legacy = await strapi.db.query('api::quiz.quiz').findOne({
      where: { id: Number(identifier) },
      populate: ['questions'],
    });
    if (legacy && legacy.publishedAt) return legacy;
  }

  return null;
};

export default factories.createCoreController(
  'api::quiz.quiz',
  ({ strapi }) => ({
    /* ---------------------------------------------------------------- *
     * فهرست آزمون‌ها — پاسخ‌ها فقط برای دبیر
     * ---------------------------------------------------------------- */
    async find(ctx) {
      const { data, meta } = await super.find(ctx);

      if (!data || isStaffRequest(ctx)) {
        return { data, meta };
      }

      const sanitized = Array.isArray(data)
        ? data.map((quiz: any) => stripAnswerKey(quiz))
        : stripAnswerKey(data);

      return { data: sanitized, meta };
    },

    async findOne(ctx) {
      const response = await super.findOne(ctx);

      if (!response?.data || isStaffRequest(ctx)) {
        return response;
      }

      return { ...response, data: stripAnswerKey(response.data) };
    },

    /* ---------------------------------------------------------------- *
     * تصحیح و ثبت کارنامه
     * ---------------------------------------------------------------- */
    async submit(ctx) {
      const identifier = String(ctx.params.id || '').trim();
      const body = (ctx.request.body || {}) as Record<string, any>;

      if (!identifier) {
        return ctx.badRequest('شناسهٔ آزمون ارسال نشده است.');
      }

      /* ---------- ۱. هویت دانش‌آموز ---------- */
      let studentName = cleanText(body.studentName, 80);
      let studentClass = cleanText(body.studentClass, 40);
      let nationalCode = cleanText(body.nationalCode, 10);

      // اگر دانش‌آموز وارد حسابش شده باشد، هویت از حسابش (users-permissions)
      // خوانده می‌شود تا کسی نتواند با کد ملی دیگری کارنامه بسازد.
      const account = await resolveStudentFromContext(ctx);

      if (account) {
        studentName = cleanText(account.fullName, 80) || studentName;
        studentClass = cleanText(account.studentClass, 40) || studentClass;
        nationalCode = account.nationalCode;
      }

      if (studentName.length < 3) {
        return ctx.badRequest('نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
      }
      if (!NATIONAL_CODE_PATTERN.test(nationalCode) || /^(\d)\1{9}$/.test(nationalCode)) {
        return ctx.badRequest('کد ملی باید دقیقاً ۱۰ رقم معتبر باشد.');
      }
      if (studentClass.length < 1) {
        return ctx.badRequest('کلاس / پایه را وارد کنید.');
      }

      /* ---------- ۲. یافتن آزمون ---------- */
      const quiz: any = await findQuizWithQuestions(strapi, identifier);

      if (!quiz) {
        return ctx.notFound('آزمون مورد نظر یافت نشد یا هنوز منتشر نشده است.');
      }

      const questions: any[] = Array.isArray(quiz.questions) ? quiz.questions : [];

      if (questions.length === 0) {
        return ctx.badRequest('این آزمون هنوز سؤالی ندارد.');
      }

      /* ---------- ۳. جلوگیری از ثبت تکراری ---------- */
      const quizKey = String(quiz.documentId || quiz.id);
      const submissionKey = `${quizKey}:${nationalCode}`;

      const previous = await strapi.db.query('api::submission.submission').findOne({
        where: { submissionKey },
      });

      if (previous) {
        ctx.status = 409;
        ctx.body = {
          error: {
            status: 409,
            name: 'AlreadySubmitted',
            message: 'شما قبلاً در این آزمون شرکت کرده‌اید و هر دانش‌آموز فقط یک بار می‌تواند ثبت کند.',
          },
          result: buildResultFromStoredSubmission(previous),
        };
        return;
      }

      /* ---------- ۴. تصحیح ---------- */
      const submittedAnswers = extractAnswers(body.answers);

      let earnedScore = 0;
      let totalPossibleScore = 0;
      let correctAnswersCount = 0;

      const details = questions.map((question: any, index: number) => {
        const options = toOptionList(question.options);
        const weight = Number(question.score) > 0 ? Number(question.score) : 1;
        const correctIndex = resolveCorrectIndex(question, options.length);

        totalPossibleScore += weight;

        const rawSelected = pickAnswer(submittedAnswers, question, index);
        const selectedIndex =
          rawSelected === null || rawSelected === undefined || rawSelected === ''
            ? null
            : Number(rawSelected);

        const normalizedSelected =
          selectedIndex !== null &&
          Number.isInteger(selectedIndex) &&
          selectedIndex >= 0 &&
          (options.length === 0 || selectedIndex < options.length)
            ? selectedIndex
            : null;

        const isCorrect =
          normalizedSelected !== null &&
          correctIndex !== null &&
          normalizedSelected === correctIndex;

        if (isCorrect) {
          earnedScore += weight;
          correctAnswersCount += 1;
        }

        return {
          questionId: question.documentId || question.id,
          questionText: question.questionText || '',
          options,
          selectedOption: normalizedSelected,
          correctAnswer: correctIndex,
          isCorrect,
          weight,
        };
      });

      const totalQuestions = questions.length;
      const percentage =
        totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;

      const maxAllowedSeconds =
        (Number(quiz.durationMinutes) > 0 ? Number(quiz.durationMinutes) : 15) * 60 +
        MAX_TIME_SLACK_SECONDS;

      const timeSpentSeconds = clamp(
        Math.round(Number(body.timeSpentSeconds) || 0),
        0,
        maxAllowedSeconds
      );

      const result = {
        score: earnedScore,
        totalScore: totalPossibleScore,
        correctCount: correctAnswersCount,
        totalQuestions,
        percentage,
        details,
      };

      /* ---------- ۵. ذخیره ---------- */
      try {
        await strapi.documents('api::submission.submission').create({
          status: 'published',
          data: {
            studentName,
            studentClass,
            nationalCode,
            submissionKey,
            score: earnedScore,
            timeSpentSeconds,
            answers: { ...result, rawAnswers: submittedAnswers },
            quiz: quizKey,
          },
        });
      } catch (error: any) {
        // مسابقه‌ی هم‌زمان: ایندکس یکتا مانع رکورد دوم می‌شود
        if (String(error?.message || '').toLowerCase().includes('unique')) {
          ctx.status = 409;
          ctx.body = {
            error: {
              status: 409,
              name: 'AlreadySubmitted',
              message: 'کارنامهٔ این آزمون برای شما قبلاً ثبت شده است.',
            },
          };
          return;
        }

        strapi.log.error('خطا در ذخیره سابمیشن دانش‌آموز در دیتابیس:', error);
        return ctx.internalServerError(
          'آزمون تصحیح شد، اما ذخیره نتیجه در سرور ناموفق بود.'
        );
      }

      return ctx.send({
        message: 'آزمون با موفقیت تصحیح و ثبت شد.',
        result,
      });
    },
  })
);

/* ============================================================================
 * توابع کمکی
 * ==========================================================================*/

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** پاسخ‌ها می‌توانند مستقیماً یا داخل کلید answers ارسال شوند */
function extractAnswers(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const asRecord = raw as Record<string, any>;
  if (asRecord.answers && typeof asRecord.answers === 'object' && !Array.isArray(asRecord.answers)) {
    return asRecord.answers as Record<string, any>;
  }
  return asRecord;
}

/** پاسخ یک سؤال را با documentId، id، رشتهٔ id یا ایندکس پیدا می‌کند */
function pickAnswer(
  answers: Record<string, any>,
  question: Record<string, any>,
  index: number
): unknown {
  const candidates = [
    question.documentId,
    question.id,
    question.id !== undefined ? String(question.id) : undefined,
    index,
    String(index),
  ].filter((key) => key !== undefined && key !== null);

  for (const key of candidates) {
    const value = answers[key as keyof typeof answers];
    if (value !== undefined) return value;
  }

  return null;
}

/** نتیجه‌ی ذخیره‌شده در یک سابمیشن قبلی را دوباره می‌سازد */
function buildResultFromStoredSubmission(submission: any) {
  const stored = submission?.answers || {};
  return {
    score: Number(stored.score) || 0,
    totalScore: Number(stored.totalScore) || 0,
    correctCount: Number(stored.correctCount) || 0,
    totalQuestions: Number(stored.totalQuestions) || 0,
    percentage: Number(stored.percentage) || 0,
    details: Array.isArray(stored.details) ? stored.details : [],
    alreadySubmitted: true,
  };
}
