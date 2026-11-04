export interface Quiz {
  /** شناسه سند استراپی (documentId) */
  id: string;
  documentId?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  slug?: string | null;
  questionCount?: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  documentId?: string;
  order?: number;
  questionText: string;
  options: string[];
  score?: number;
}

export interface QuestionEvaluation {
  questionId?: string;
  questionText: string;
  options?: string[];
  selectedOption: number | null;
  correctAnswer: number | null;
  isCorrect: boolean;
  weight?: number;
}

export interface QuizResult {
  score: number;
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  details: QuestionEvaluation[];
  alreadySubmitted?: boolean;
}

export interface SubmitQuizPayload {
  studentName: string;
  studentClass: string;
  nationalCode: string;
  timeSpentSeconds: number;
  answers: Record<string, number | string>;
}
