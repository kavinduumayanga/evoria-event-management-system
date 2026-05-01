export type RegistrationQuestionType = 'text' | 'number' | 'choice';

export interface EventRegistrationQuestion {
  id: string;
  question: string;
  type: RegistrationQuestionType;
  required: boolean;
}

const normalizeQuestion = (input: any): EventRegistrationQuestion | null => {
  if (!input || typeof input !== 'object') return null;

  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const required = Boolean(input.required);

  if (!id || !question) return null;
  if (type !== 'text' && type !== 'number' && type !== 'choice') return null;

  return {
    id,
    question,
    type,
    required,
  };
};

export const normalizeRegistrationQuestions = (raw: unknown): EventRegistrationQuestion[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const questions: EventRegistrationQuestion[] = [];

  for (const item of raw) {
    const normalized = normalizeQuestion(item);
    if (!normalized) continue;
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    questions.push(normalized);
  }

  return questions;
};

export const getEventRegistrationQuestions = (event: any): EventRegistrationQuestion[] => {
  const fromRegistrationFields = normalizeRegistrationQuestions(event?.registrationFields?.customQuestions);
  if (fromRegistrationFields.length > 0) {
    return fromRegistrationFields;
  }

  return normalizeRegistrationQuestions(event?.customQuestions);
};

