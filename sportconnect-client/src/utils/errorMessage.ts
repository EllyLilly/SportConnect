export function getErrorMessage(err: any, fallback: string): string {
  if (err.response?.data?.detail) {
    return err.response.data.detail;
  }

  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.response?.status === 429) {
    return 'Слишком много запросов. Подождите немного';
  }

  if (err.response?.status === 401) {
    return 'Необходимо войти в систему';
  }

  if (err.response?.status === 403) {
    return 'Недостаточно прав для этого действия';
  }

  if (err.response?.status === 404) {
    return 'Не найдено';
  }

  if (err.response?.status === 409) {
    return 'Конфликт: данные уже существуют или операция невозможна';
  }

  if (err.response?.status === 500) {
    return 'Внутренняя ошибка сервера';
  }

  return fallback;
}