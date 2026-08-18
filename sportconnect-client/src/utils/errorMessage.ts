export function getErrorMessage(err: any, fallback: string): string {
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.response?.data?.title) {
    return err.response.data.title;
  }

  if (err.response?.status === 429) {
    return 'Слишком много запросов. Подождите немного';
  }

  return fallback;
}