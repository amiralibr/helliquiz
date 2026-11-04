import type { Core } from '@strapi/strapi';

/* ============================================================================
 * مجوزهای پیش‌فرض
 * ==========================================================================*/

const PUBLIC_ACTIONS = ['api::quiz.quiz.find', 'api::quiz.quiz.findOne'];

const AUTHENTICATED_ACTIONS = [
  'api::quiz.quiz.find',
  'api::quiz.quiz.findOne',
  'api::quiz.quiz.create',
  'api::quiz.quiz.update',
  'api::quiz.quiz.delete',
  'api::question.question.find',
  'api::question.question.findOne',
  'api::question.question.create',
  'api::question.question.update',
  'api::question.question.delete',
  'api::submission.submission.find',
  'api::submission.submission.findOne',
  'api::submission.submission.create',
  'api::submission.submission.update',
  'api::submission.submission.delete',
];

const ensureRolePermissions = async (strapi: Core.Strapi, roleType: string, actions: string[]) => {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });

  if (!role) return;

  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: { id: role.id } } });

    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: role.id } });
    }
  }
};

/* ============================================================================
 * داده‌ی نمایشی
 * ==========================================================================*/

const DEMO_QUIZZES = [
  {
    title: 'آزمون آزمایشی ریاضی — عبارت‌های جبری',
    description: 'نمونه آزمون کوتاه برای آشنایی با سامانه؛ شامل توان، معادله و اعداد اول.',
    durationMinutes: 10,
    slug: 'demo-math',
    questions: [
      {
        questionText: 'حاصل $2^5$ کدام است؟',
        options: ['۱۶', '۲۵', '۳۲', '۶۴'],
        correctOption: 2,
        score: 10,
      },
      {
        questionText: 'اگر $x + 3 = 7$ باشد، مقدار $x^2$ چند است؟',
        options: ['۴', '۹', '۱۶', '۴۹'],
        correctOption: 2,
        score: 10,
      },
      {
        questionText: 'کدام عدد اول است؟',
        options: ['۲۱', '۲۷', '۲۹', '۳۳'],
        correctOption: 2,
        score: 10,
      },
    ],
  },
  {
    title: 'آزمون فیزیک — حرکت و سرعت',
    description: 'مفاهیم پایه‌ی سرعت متوسط، شتاب و یکاها.',
    durationMinutes: 12,
    slug: 'demo-physics',
    questions: [
      {
        questionText: 'یکای سرعت در SI چیست؟',
        options: ['متر بر ثانیه', 'کیلومتر بر ساعت', 'نیوتن', 'ژول'],
        correctOption: 0,
        score: 10,
      },
      {
        questionText:
          'خودرویی ۱۲۰ متر را در ۱۰ ثانیه طی می‌کند. سرعت متوسط آن چند متر بر ثانیه است؟',
        options: ['۱۰', '۱۲', '۱۲۰', '۱٫۲'],
        correctOption: 1,
        score: 10,
      },
    ],
  },
];

const seedTeacher = async (strapi: Core.Strapi) => {
  const email = process.env.SEED_TEACHER_EMAIL || 'teacher@helli.ir';
  const username = process.env.SEED_TEACHER_USERNAME || 'teacher';
  const password = process.env.SEED_TEACHER_PASSWORD || 'teacher1234';

  const existing = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email } });

  if (existing) return;

  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  await strapi.plugin('users-permissions').service('user').add({
    username,
    email,
    password,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role?.id,
  });

  strapi.log.info(`[seed] حساب دبیر ساخته شد → ${email} / ${password}`);
};

const seedQuizzes = async (strapi: Core.Strapi) => {
  const quizCount = await strapi.documents('api::quiz.quiz').count({});
  if (quizCount > 0) return;

  for (const demo of DEMO_QUIZZES) {
    const quiz = await strapi.documents('api::quiz.quiz').create({
      status: 'published',
      data: {
        title: demo.title,
        description: demo.description,
        durationMinutes: demo.durationMinutes,
        slug: demo.slug,
      },
    });

    for (const question of demo.questions) {
      await strapi.documents('api::question.question').create({
        status: 'published',
        data: {
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          score: question.score,
          quiz: quiz.documentId,
        },
      });
    }
  }

  strapi.log.info('[seed] آزمون‌های نمایشی ایجاد شدند.');
};

const seedStudent = async (strapi: Core.Strapi) => {
  const nationalCode = process.env.SEED_STUDENT_NATIONAL_CODE || '0012345678';
  const password = process.env.SEED_STUDENT_PASSWORD || 'student1234';

  const service = strapi.service('api::student.student');
  const existing = await service.findByNationalCode(nationalCode);

  if (!existing) {
    const { hash, salt } = service.hashPassword(password);
    await strapi.documents('api::student.student').create({
      data: {
        fullName: 'دانش‌آموز نمونه',
        studentClass: 'نهم ۱',
        nationalCode,
        passwordHash: hash,
        passwordSalt: salt,
      },
    });
    strapi.log.info(`[seed] حساب دانش‌آموز ساخته شد → ${nationalCode} / ${password}`);
  }

  // یک کارنامه‌ی نمونه برای نمایش پنل دانش‌آموز
  const quizList = await strapi.documents('api::quiz.quiz').findMany({
    status: 'published',
    populate: ['questions'],
    sort: ['createdAt:asc'],
    limit: 1,
  });

  const quiz: any = quizList[0];
  if (!quiz) return;

  const quizKey = String(quiz.documentId || quiz.id);
  const submissionKey = `${quizKey}:${nationalCode}`;

  const alreadySubmitted = await strapi.db
    .query('api::submission.submission')
    .findOne({ where: { submissionKey } });

  if (alreadySubmitted) return;

  const questions: any[] = quiz.questions || [];
  const details = questions.map((question: any, index: number) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const correct = Number(question.correctOption ?? 0);
    // در کارنامه‌ی نمونه، سؤال دوم عمداً غلط پاسخ داده شده است
    const selected = index === 1 ? (correct + 1) % Math.max(options.length, 1) : correct;

    return {
      questionId: question.documentId || question.id,
      questionText: question.questionText || '',
      options,
      selectedOption: selected,
      correctAnswer: correct,
      isCorrect: selected === correct,
      weight: Number(question.score) || 1,
    };
  });

  const totalScore = details.reduce((sum, item) => sum + item.weight, 0);
  const score = details.filter((item) => item.isCorrect).reduce((sum, item) => sum + item.weight, 0);

  await strapi.documents('api::submission.submission').create({
    status: 'published',
    data: {
      studentName: 'دانش‌آموز نمونه',
      studentClass: 'نهم ۱',
      nationalCode,
      submissionKey,
      score,
      timeSpentSeconds: 245,
      answers: {
        score,
        totalScore,
        correctCount: details.filter((item) => item.isCorrect).length,
        totalQuestions: details.length,
        percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
        details,
      },
      quiz: quizKey,
    },
  });

  strapi.log.info('[seed] کارنامه‌ی نمونه برای دانش‌آموز نمایشی ثبت شد.');
};

/* ============================================================================
 * Lifecycle
 * ==========================================================================*/

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await ensureRolePermissions(strapi, 'public', PUBLIC_ACTIONS);
      await ensureRolePermissions(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
    } catch (error) {
      strapi.log.error('تنظیم مجوزهای پیش‌فرض ناموفق بود:', error);
    }

    if (process.env.SEED_DEMO !== 'true') return;

    try {
      await seedTeacher(strapi);
      await seedQuizzes(strapi);
      await seedStudent(strapi);
    } catch (error) {
      strapi.log.error('ساخت داده‌ی نمایشی ناموفق بود:', error);
    }
  },
};
