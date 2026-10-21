export interface Quiz {
  id: number;
  documentId: string;
  title: string;
  description: string;
  durationMinutes: number;
  slug?: string;
  questions?: Question[];
}

export interface Question {
  id: number | string;
  documentId?: string;
  questionText?: string;
  prompt?: string;
  options: string[] | Record<string, string>;
  score?: number;
}

export interface QuestionEvaluation {
  questionId?: number | string;
  studentAnswer?: any;
  correctAnswer?: any;
  isCorrect: boolean;
}

export interface SubmissionResponse {
  message: string;
  result: {
    score: number;
    totalQuestions: number;
    percentage: number;
    details: Array<QuestionEvaluation> | Record<string | number, QuestionEvaluation>;
  };
}
