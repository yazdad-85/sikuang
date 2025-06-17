export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthYear(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateForInput(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export function getTodayForInput(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} hari yang lalu`;
  } else if (hours > 0) {
    return `${hours} jam yang lalu`;
  } else if (minutes > 0) {
    return `${minutes} menit yang lalu`;
  } else {
    return 'Baru saja';
  }
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Helper function to get the number of days in a month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Helper function to format a date range
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} - ${formatDateLong(end)}`;
  } else {
    return `${formatDateLong(start)} - ${formatDateLong(end)}`;
  }
}

// Helper function to check if a date is between two dates
export function isDateBetween(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}
