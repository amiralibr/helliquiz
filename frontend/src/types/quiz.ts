export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: number;
  documentId?: string;
  title: string;
  options: QuestionOption[];
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: number;
  documentId?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questions?: Question[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionResult {
  questionId: number;
  questionTitle: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  score: number;
  points: number;
  explanation?: string;
}

export interface SubmissionResponse {
  submissionId: number;
  studentName: string;
  quizTitle: string;
  totalQuestions: number;
  correctAnswersCount: number;
  earnedScore: number;
  totalScore: number;
  percentage: number;
  results: QuestionResult[];
}
export interface SubmissionPayload {
  quizId: number;
  studentName: string;
  answers: {
    questionId: number;
    selectedOption: number; 
  }[];
}

export type SubmissionResult = SubmissionResponse;
