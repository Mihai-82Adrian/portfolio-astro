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
  lastGeneratedAt: number | null;
}

export const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createEmptyAnswers(questions: QuizQuestion[]): QuizAnswer[] {
  return questions.map((q) => ({
    questionId: q.id,
    selectedKey: null,
    customText: '',
  }));
}

export function isWeeklyCooldownActive(lastGeneratedAt: number | null): boolean {
  if (!lastGeneratedAt) return false;
  return Date.now() - lastGeneratedAt < WEEKLY_COOLDOWN_MS;
}

export function cooldownRemainingLabel(lastGeneratedAt: number | null): string {
  if (!lastGeneratedAt) return '';
  const remaining = WEEKLY_COOLDOWN_MS - (Date.now() - lastGeneratedAt);
  if (remaining <= 0) return '';
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? 'in 1 Tag' : `in ${days} Tagen`;
}
