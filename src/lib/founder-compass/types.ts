export interface QuizOption {
  key: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  title: string;
  body: string;
  options: QuizOption[];
  dimension: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedKey: string | null;
  customText: string;
}

export interface CompassState {
  currentStep: number;
  answers: QuizAnswer[];
  status: 'idle' | 'in-progress' | 'submitting' | 'streaming' | 'complete' | 'error';
  report: string | null;
  errorMessage: string | null;
}

export function createEmptyAnswers(questions: QuizQuestion[]): QuizAnswer[] {
  return questions.map((q) => ({
    questionId: q.id,
    selectedKey: null,
    customText: '',
  }));
}
