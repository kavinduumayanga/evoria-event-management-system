export const safeArray = <T = any>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

