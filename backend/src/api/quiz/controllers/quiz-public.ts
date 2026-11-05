/**
 * API عمومی آزمون‌ها (بدون احراز هویت).
 *
 * چرا جدا از هسته‌ی استراپی؟ چون پاسخ صحیح سؤال‌ها هرگز نباید در پاسخ
 * عمومی ظاهر شود و خروجی باید دقیقاً همان چیزی باشد که فرانت‌اند نیاز دارد.
 * این کنترلر با documents API داخلی کار می‌کند و فیلدها را صریح انتخاب می‌کند.
 */

const mapQuestion = (question: any, index: number) => ({
  id: question.documentId || question.id,
  documentId: question.documentId,
  order: index + 1,
  questionText: question.questionText || '',
  options: Array.isArray(question.options)
    ? question.options.map((option: unknown) => String(option))
    : [],
  score: Number(question.score) || 1,
});

const mapQuiz = (quiz: any, includeQuestions: boolean) => {
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  return {
    id: quiz.documentId || quiz.id,
    documentId: quiz.documentId,
    title: quiz.title || 'بدون عنوان',
    description: quiz.description || '',
    durationMinutes: Number(quiz.durationMinutes) || 15,
    slug: quiz.slug || null,
    questionCount: questions.length,
    ...(includeQuestions ? { questions: questions.map(mapQuestion) } : {}),
  };
};

const sortQuestions = (questions: any[]) =>
  [...questions].sort((a, b) => {
    const aId = Number(a?.id) || 0;
    const bId = Number(b?.id) || 0;
    return aId - bId;
  });

export default {
  /** GET /api/quiz-public — فهرست آزمون‌های منتشرشده (بدون سؤال) */
  async list(ctx: any) {
    const quizzes = await strapi.documents('api::quiz.quiz').findMany({
      status: 'published',
      populate: ['questions'],
      sort: ['createdAt:desc'],
      limit: 100,
    });

    ctx.set('Cache-Control', 'no-store');
    return ctx.send({ data: quizzes.map((quiz: any) => mapQuiz(quiz, false)) });
  },

  /** GET /api/quiz-public/:id — یک آزمون همراه سؤال‌ها (بدون پاسخ صحیح) */
  async findOne(ctx: any) {
    const identifier = String(ctx.params.id || '').trim();

    if (!identifier) {
      return ctx.badRequest('شناسهٔ آزمون مشخص نیست.');
    }

    let quiz: any = await strapi.documents('api::quiz.quiz').findOne({
      documentId: identifier,
      status: 'published',
      populate: ['questions'],
    });

    if (!quiz && /^\d+$/.test(identifier)) {
      quiz = await strapi
        .documents('api::quiz.quiz')
        .findFirst({ filters: { id: Number(identifier) }, status: 'published', populate: ['questions'] });
    }

    if (!quiz) {
      return ctx.notFound('آزمون مورد نظر یافت نشد.');
    }

    const publishedQuestions = sortQuestions(
      (quiz.questions || []).filter((question: any) => question?.publishedAt)
    );

    ctx.set('Cache-Control', 'no-store');
    return ctx.send({ data: mapQuiz({ ...quiz, questions: publishedQuestions }, true) });
  },
};
