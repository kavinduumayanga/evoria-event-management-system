export const getApiErrorMessage = (error: any, fallbackMessage: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};
