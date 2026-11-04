import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::quiz.quiz',
  ({ strapi }) => ({
    async find(ctx) {
      const { data, meta } = await super.find(ctx);

      if (!data) {
        return { data, meta };
      }

      const sanitizedData = Array.isArray(data)
        ? data.map((quiz: any) => {
            if (Array.isArray(quiz.questions)) {
              quiz.questions = quiz.questions.map(
                ({ correctAnswer, ...questionRest }: any) => questionRest,
              );
            }

            return quiz;
          })
        : data;

      return { data: sanitizedData, meta };
    },

    async findOne(ctx) {
      const response = await super.findOne(ctx);

      if (!response?.data) {
        return response;
      }

      const quiz = response.data;

      if (Array.isArray(quiz.questions)) {
        quiz.questions = quiz.questions.map(
          ({ correctAnswer, ...questionRest }: any) => questionRest,
        );
      }

      return response;
    },

    async submit(ctx) {
      const { id } = ctx.params;
      const body = (ctx.request.body || {}) as Record<string, any>;

      const studentName =
        body.studentName || body.answers?.studentName || 'ناشناس';

      const studentClass =
        body.studentClass || body.answers?.studentClass || '-';

      const nationalCode =
        body.nationalCode || body.answers?.nationalCode || '-';

      const timeSpentSeconds = Number(
        body.timeSpentSeconds ?? body.answers?.timeSpentSeconds ?? 0,
      );

      const submittedAnswers: Record<string, any> =
        body.answers &&
        typeof body.answers === 'object' &&
        !Array.isArray(body.answers) &&
        !('answers' in body.answers)
          ? body.answers
          : body.answers?.answers || body.answers || {};

      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: id,
        populate: ['questions'],
      });

      if (!quiz) {
        return ctx.notFound('آزمون مورد نظر یافت نشد.');
      }

      const questions: any[] = (quiz as any).questions || [];

      let earnedScore = 0;
      let totalPossibleScore = 0;
      let correctAnswersCount = 0;

      const details = questions.map((question, index) => {
        const questionId = question.id;
        const questionDocumentId = question.documentId;

        const questionWeight =
          Number(question.score) > 0 ? Number(question.score) : 1;

        totalPossibleScore += questionWeight;

        const rawSelected =
          (questionDocumentId &&
            submittedAnswers[questionDocumentId] !== undefined
            ? submittedAnswers[questionDocumentId]
            : undefined) ??
          (questionId && submittedAnswers[questionId] !== undefined
            ? submittedAnswers[questionId]
            : undefined) ??
          (submittedAnswers[String(questionId)] !== undefined
            ? submittedAnswers[String(questionId)]
            : undefined) ??
          (submittedAnswers[index] !== undefined
            ? submittedAnswers[index]
            : undefined) ??
          null;

        const selectedIndex =
          rawSelected === null || rawSelected === undefined || rawSelected === ''
            ? null
            : Number(rawSelected);

        const rawCorrect = question.correctAnswer;

        const parsedCorrect =
          rawCorrect === null || rawCorrect === undefined || rawCorrect === ''
            ? null
            : Number(rawCorrect);

        /*
         * این تبدیل بر این فرض استوار است که correctAnswer در Strapi
         * از ۱ تا ۴ ذخیره شده و فرانت‌اند گزینه‌ها را از ۰ تا ۳ می‌فرستد.
         * در این حالت، مثلاً پاسخ صحیح ۱ در Strapi به ایندکس ۰ تبدیل می‌شود.
         */
        const normalizedCorrectIndex =
          parsedCorrect === null
            ? null
            : parsedCorrect >= 1
              ? parsedCorrect - 1
              : parsedCorrect;

        const isCorrect =
          selectedIndex !== null &&
          normalizedCorrectIndex !== null &&
          selectedIndex === normalizedCorrectIndex;

        if (isCorrect) {
          earnedScore += questionWeight;
          correctAnswersCount += 1;
        }

        return {
          questionId: questionDocumentId || questionId,
          questionText: question.questionText || question.prompt || '',
          selectedOption: selectedIndex,
          correctAnswer: normalizedCorrectIndex,
          isCorrect,
          weight: questionWeight,
        };
      });

      const totalQuestions = questions.length;

      const percentage =
        totalPossibleScore > 0
          ? Math.round((earnedScore / totalPossibleScore) * 100)
          : 0;

      try {
        await strapi.documents('api::submission.submission').create({
          // باعث می‌شود سابمیشن جدید در وضعیت Published ساخته شود.
          status: 'published',
          data: {
            studentName,
            studentClass,
            nationalCode,
            score: earnedScore,
            timeSpentSeconds,
            answers: {
              score: earnedScore,
              totalScore: totalPossibleScore,
              correctCount: correctAnswersCount,
              totalQuestions,
              percentage,
              details,
              rawAnswers: submittedAnswers,
            },
            quiz: (quiz as any).documentId || (quiz as any).id,
          },
        });
      } catch (error) {
        strapi.log.error(
          'خطا در ذخیره سابمیشن دانش‌آموز در دیتابیس:',
          error,
        );

        return ctx.internalServerError(
          'آزمون تصحیح شد، اما ذخیره نتیجه در سرور ناموفق بود.',
        );
      }

      return ctx.send({
        message: 'آزمون با موفقیت تصحیح و ثبت شد.',
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
  }),
);
