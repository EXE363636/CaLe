import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} triệu`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} giây trước`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  return formatDateTime(date);
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
}

export function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function getReputationLevel(score: number): { level: string; color: string } {
  if (score >= 90) {
    return { level: 'Xuất sắc', color: 'text-green-600' };
  }
  if (score >= 75) {
    return { level: 'Tốt', color: 'text-primary-600' };
  }
  if (score >= 50) {
    return { level: 'Trung bình', color: 'text-warning-600' };
  }
  return { level: 'Cần cải thiện', color: 'text-red-600' };
}

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 85) {
    return { label: 'Rất phù hợp', color: 'bg-green-100 text-green-700' };
  }
  if (score >= 65) {
    return { label: 'Phù hợp', color: 'bg-primary-100 text-primary-700' };
  }
  return { label: 'Cần cân nhắc', color: 'bg-gray-100 text-gray-700' };
}

export function isShiftPast(shiftDate: string, endTime: string): boolean {
  const end = new Date(`${shiftDate}T${endTime}`);
  return end < new Date();
}

export function isShiftActive(shiftDate: string, startTime: string, endTime: string): boolean {
  const now = new Date();
  const start = new Date(`${shiftDate}T${startTime}`);
  const end = new Date(`${shiftDate}T${endTime}`);
  return now >= start && now <= end;
}

export function isCheckInAllowed(shiftDate: string, startTime: string): boolean {
  const now = new Date();
  const start = new Date(`${shiftDate}T${startTime}`);
  const checkInWindow = 30 * 60 * 1000; // 30 minutes before
  return now >= new Date(start.getTime() - checkInWindow) && now <= start;
}

export function isCheckOutAllowed(shiftDate: string, endTime: string): boolean {
  const now = new Date();
  const end = new Date(`${shiftDate}T${endTime}`);
  return now >= end;
}

export function generateTimeSlots(fromHour = 6, toHour = 23): string[] {
  const slots: string[] = [];
  for (let h = fromHour; h <= toHour; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

export function getDayName(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return days[d.getDay()];
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
