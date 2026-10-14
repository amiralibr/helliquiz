import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async find(ctx) {
    const { data, meta } = await super.find(ctx);
    if (!data) return { data, meta };

    const sanitizedData = Array.isArray(data)
      ? data.map((quiz: any) => sanitizeQuiz(quiz))
      : sanitizeQuiz(data);

    return { data: sanitizedData, meta };
  },

  async findOne(ctx) {
    const { data, meta } = await super.findOne(ctx);
    if (!data) return { data, meta };

    return { data: sanitizeQuiz(data), meta };
  },

  async submit(ctx) {
    const { quizId, studentName, timeSpentSeconds, answers } = ctx.request.body;

    if (!quizId || !studentName || !answers) {
      return ctx.badRequest('اطلاعات ارسالی ناقص است.');
    }

    // واکشی آزمون به همراه کلیدهای سوالات
    const targetQuiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: typeof quizId === 'string' && isNaN(Number(quizId)) 
        ? { documentId: quizId } 
        : { id: Number(quizId) },
      populate: { questions: true },
    });

    if (!targetQuiz) {
      return ctx.notFound('آزمون مورد نظر یافت نشد.');
    }

    let totalScore = 0;
    let earnedScore = 0;
    const evaluationResults: Record<string, any> = {};

    const questions = targetQuiz.questions || [];

    for (const question of questions) {
      const qScore = question.score || 1;
      totalScore += qScore;

      const studentAnswer = answers[question.id] ?? answers[question.documentId];
      const isCorrect = studentAnswer === question.correctAnswer;

      if (isCorrect) {
        earnedScore += qScore;
      }

      evaluationResults[question.id] = {
        studentAnswer: studentAnswer ?? null,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    }

    // ذخیره سابمیشن در دیتابیس
    await strapi.db.query('api::submission.submission').create({
      data: {
        studentName,
        score: earnedScore,
        timeSpentSeconds: timeSpentSeconds || 0,
        answers,
        quiz: targetQuiz.id,
        publishedAt: new Date(),
      },
    });

    return {
      message: 'آزمون با موفقیت ثبت و تصحیح شد.',
      result: {
        studentName,
        totalScore,
        earnedScore,
        percentage: totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0,
        timeSpentSeconds: timeSpentSeconds || 0,
        details: evaluationResults,
      },
    };
  },
}));

function sanitizeQuiz(quiz: any) {
  if (!quiz) return quiz;

  if (Array.isArray(quiz.questions)) {
    quiz.questions = quiz.questions.map((q: any) => {
      const { correctAnswer, ...safeQuestion } = q;
      return safeQuestion;
    });
  }

  return quiz;
}
