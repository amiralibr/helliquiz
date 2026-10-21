export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: number;
  documentId?: string;
  title: string;
  options: QuestionOption[];
  points?: number;
  score?: number;
  explanation?: string;
}

export interface Quiz {
  id: number;
  documentId?: string;
  title: string;
  slug?: string;
  description?: string;
  durationMinutes: number;
  questions?: Question[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmissionPayload {
  quizId: number | string;
  studentName: string;
  timeSpentSeconds?: number;
  answers: Record<string | number, string>;
}

export interface QuestionEvaluation {
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SubmissionResponse {
  message: string;
  result: {
    studentName: string;
    totalScore: number;
    earnedScore: number;
    percentage: number;
    timeSpentSeconds: number;
    details: Record<string | number, QuestionEvaluation>;
  };
}

export type SubmissionResult = SubmissionResponse;
