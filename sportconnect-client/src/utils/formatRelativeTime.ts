export function formatRelativeTime(utc: string): string {
  const date = new Date(utc);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 0 && diffMinutes > -60) {
    return 'Началась';
  }

  if (diffMinutes < 0) {
    return 'Завершена';
  }

  if (diffMinutes < 60) {
    return `Через ${diffMinutes} мин`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Через ${diffHours} ч`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Завтра';
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  const options: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };

  return date.toLocaleString('ru-RU', options);
}