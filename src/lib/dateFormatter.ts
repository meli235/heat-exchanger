/**
 * Formats a last login timestamp dynamically.
 * Automatically displays "Hari ini, HH.mm", "Kemarin, HH.mm", or "DD MMM YYYY, HH.mm"
 * based on the user's actual login timestamp.
 */
export function formatLastLogin(value?: string | null): string {
  if (!value || value === 'Belum Pernah' || value === 'Never' || value === 'Baru saja') {
    return value || 'Belum Pernah';
  }

  // Check if value is an ISO date or parseable date string
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    // If it's a legacy static text, return as-is
    return value;
  }

  const now = new Date();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(':', '.');

  if (isSameDay(date, now)) {
    return `Hari ini, ${timeStr}`;
  } else if (isSameDay(date, yesterday)) {
    return `Kemarin, ${timeStr}`;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}, ${timeStr}`;
  }
}
