/**
 * quiz controller
 */
import { factories } from '@strapi/strapi';

// تعریف نوع داده‌ای برای ورودی و خروجی تصحیح آزمون
interface SubmitBody {
  answers?: Record<string | number, string>;
}

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  // ۱. اکشن واکشی لیست کوئیزها (با حذف پاسخ صحیح برای امنیت فرانت‌اند)
  async find(ctx) {
    const { data, meta } = await super.find(ctx);
    if (!data) return { data, meta };

    const sanitizedData = Array.isArray(data)
      ? data.map((quiz: any) => {
          if (quiz.questions && Array.isArray(quiz.questions)) {
            quiz.questions = quiz.questions.map(({ correctAnswer, ...qRest }: any) => qRest);
          }
          return quiz;
        })
      : data;

    return { data: sanitizedData, meta };
  },

  // ۲. اکشن واکشی یک کوئیز (با حذف پاسخ صحیح)
  async findOne(ctx) {
    const response = await super.findOne(ctx);
    if (!response || !response.data) return response;

    const quiz = response.data;
    if (quiz.questions && Array.isArray(quiz.questions)) {
      quiz.questions = quiz.questions.map(({ correctAnswer, ...qRest }: any) => qRest);
    }

    return response;
  },

  // ۳. اکشن تصحیح اختصاصی سمت سرور
  async submit(ctx) {
    const { id } = ctx.params;
    const body = ctx.request.body as SubmitBody;
    const submittedAnswers = body?.answers || {};

    // واکشی آزمون به همراه کلیدهای درست مستقیماً از دیتابیس
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: id,
      populate: ['questions'],
    });

    if (!quiz) {
      return ctx.notFound('آزمون مورد نظر یافت نشد.');
    }

    const questions: any[] = (quiz as any).questions || [];
    let score = 0;
    const totalQuestions = questions.length;

    const details = questions.map((question) => {
      const qId = question.id;
      const selectedOption = submittedAnswers[qId] || submittedAnswers[String(qId)] || null;
      const isCorrect = selectedOption !== null && selectedOption === question.correctAnswer;

      if (isCorrect) {
        score += 1;
      }

      return {
        questionId: qId,
        selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    return ctx.send({
      message: 'آزمون با موفقیت تصحیح شد.',
      result: {
        score,
        totalQuestions,
        percentage,
        details,
      },
    });
  },
}));
