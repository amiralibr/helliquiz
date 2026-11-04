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
  questionText?: string;
  studentAnswer?: any;
  correctAnswer?: any;
  isCorrect: boolean;
  weight?: number;
}

export interface SubmissionResponse {
  message: string;
  result: {
    score: number;
    totalScore?: number;
    correctCount?: number;
    totalQuestions: number;
    percentage: number;
    details: Array<QuestionEvaluation> | Record<string | number, QuestionEvaluation>;
  };
}

export interface SubmissionPayload {
  studentName: string;
  studentClass: string;
  nationalCode: string;
  timeSpentSeconds: number;
  answers: Record<string | number, string | number>;
}
