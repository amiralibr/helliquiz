import { factories } from '@strapi/strapi';

interface SubmitBody {
  answers?: Record<string | number, string | number>;
}

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
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

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    if (!response || !response.data) return response;

    const quiz = response.data;
    if (quiz.questions && Array.isArray(quiz.questions)) {
      quiz.questions = quiz.questions.map(({ correctAnswer, ...qRest }: any) => qRest);
    }

    return response;
  },

  async submit(ctx) {
    const { id } = ctx.params;
    const body = ctx.request.body as SubmitBody;
    const submittedAnswers = body?.answers || {};

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: id,
      populate: ['questions'],
    });

    if (!quiz) {
      return ctx.notFound('آزمون مورد نظر یافت نشد.');
    }

    const questions: any[] = (quiz as any).questions || [];
    
    let earnedScore = 0;        // مجموع نمره کسب‌شده توسط دانش‌آموز
    let totalPossibleScore = 0; // مجموع کل بارم آزمون
    let correctAnswersCount = 0; // تعداد سوالات درست

    const details = questions.map((question) => {
      const qId = question.id;
      const qDocId = question.documentId;

      // وزن/بارم سوال از دیتابیس (اگر خالی بود پیش‌فرض ۱)
      const questionWeight = Number(question.score) > 0 ? Number(question.score) : 1;
      totalPossibleScore += questionWeight;

      const rawSelected =
        (qDocId && submittedAnswers[qDocId] !== undefined ? submittedAnswers[qDocId] : undefined) ??
        (submittedAnswers[qId] !== undefined ? submittedAnswers[qId] : undefined) ??
        (submittedAnswers[String(qId)] !== undefined ? submittedAnswers[String(qId)] : undefined) ??
        null;

      const selectedIndex =
        rawSelected === null || rawSelected === undefined || rawSelected === ''
          ? null
          : Number(rawSelected);

      const rawCorrect = question.correctAnswer;
      const correctNumber =
        rawCorrect === null || rawCorrect === undefined || rawCorrect === ''
          ? null
          : Number(rawCorrect);

      const correctIndex = correctNumber === null ? null : correctNumber - 1;

      const isCorrect = selectedIndex !== null && selectedIndex === correctIndex;

      if (isCorrect) {
        earnedScore += questionWeight;
        correctAnswersCount += 1;
      }

      console.log(
        `[DEBUG] Q_ID: ${qId} | Weight: ${questionWeight} | Selected: ${selectedIndex} | Correct: ${correctIndex} | Match: ${isCorrect}`
      );

      return {
        questionId: qId,
        selectedOption: selectedIndex,
        correctAnswer: correctIndex,
        isCorrect,
        weight: questionWeight,
      };
    });

    const totalQuestions = questions.length;
    // محاسبه درصد وزنی: (نمره کسب شده تقسیم بر کل بارم) ضربدر ۱۰۰
    const percentage = totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;

    return ctx.send({
      message: 'آزمون با موفقیت تصحیح شد.',
      result: {
        score: earnedScore,              
        totalScore: totalPossibleScore,   
        correctCount: correctAnswersCount, 
        totalQuestions,                   
        percentage,                       
        details,
      },
    });
  },
}));
