export type PracticeQuizParams =
  | { mode: 'section'; sectionIndex: number }
  | { mode: 'search'; questionIds: number[]; startIndex?: number };

export type PracticeStackParamList = {
  PracticeHome: undefined;
  PracticeQuiz: PracticeQuizParams;
};

export type ExamStackParamList = {
  ExamHome: undefined;
  ExamQuiz: {
    sectionIndex: number;
    durationMinutes: number;
    questionCount: number;
  };
  ExamResult: { correct: number; total: number };
};
