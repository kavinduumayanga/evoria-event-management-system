export type RegistrationQuestionType =
  | 'text'
  | 'number'
  | 'choice'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'multiple_choice';

const REGISTRATION_QUESTION_TYPES: RegistrationQuestionType[] = [
  'text',
  'number',
  'choice',
  'dropdown',
  'radio',
  'checkbox',
  'multiple_choice',
];

const CHOICE_BASED_QUESTION_TYPES = new Set<RegistrationQuestionType>([
  'choice',
  'dropdown',
  'radio',
  'checkbox',
  'multiple_choice',
]);

export const isChoiceBasedQuestionType = (type: unknown): boolean => {
  if (typeof type !== 'string') return false;
  return CHOICE_BASED_QUESTION_TYPES.has(type as RegistrationQuestionType);
};

export const normalizeQuestionOptions = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const options: string[] = [];

  for (const item of raw) {
    const normalized = typeof item === 'string' ? item.trim() : String(item || '').trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(normalized);
  }

  return options;
};

export interface EventRegistrationQuestion {
  id: string;
  question: string;
  type: RegistrationQuestionType;
  required: boolean;
  options: string[];
}

const normalizeQuestion = (input: any): EventRegistrationQuestion | null => {
  if (!input || typeof input !== 'object') return null;

  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const required = Boolean(input.required);

  if (!id || !question) return null;
  if (!REGISTRATION_QUESTION_TYPES.includes(type as RegistrationQuestionType)) return null;
  const options = normalizeQuestionOptions((input as { options?: unknown }).options);

  if (isChoiceBasedQuestionType(type) && options.length < 2) return null;

  return {
    id,
    question,
    type: type as RegistrationQuestionType,
    required,
    options,
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

export const validateRegistrationAnswerAgainstQuestion = (
  question: { type: unknown; options: unknown },
  rawAnswer: string,
): boolean => {
  const answer = rawAnswer.trim();
  if (!answer) return false;

  const questionType = typeof question.type === 'string' ? question.type : '';

  if (!isChoiceBasedQuestionType(questionType)) {
    return true;
  }

  const normalizedOptions = normalizeQuestionOptions(question.options);
  if (normalizedOptions.length < 2) return false;

  const optionSet = new Set(normalizedOptions.map((option) => option.toLowerCase()));

  if (questionType === 'checkbox' || questionType === 'multiple_choice') {
    const selectedValues = answer
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toLowerCase());

    if (selectedValues.length === 0) return false;
    return selectedValues.every((value) => optionSet.has(value));
  }

  return optionSet.has(answer.toLowerCase());
};
