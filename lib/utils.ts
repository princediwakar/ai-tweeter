import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone and date utilities for IST
export const INDIAN_TZ = 'Asia/Kolkata';

export function getCurrentTimeInIST(): Date {
  // Simply return the current Date object
  // The schedule functions will handle IST conversion properly
  return new Date();
}

/**
 * Get current hour in IST timezone (0-23)
 */
export function getCurrentISTHour(date: Date = new Date()): number {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: INDIAN_TZ }));
  return istDate.getHours();
}

/**
 * Get current day of week in IST timezone (0=Sun, 1=Mon, ..., 6=Sat)
 */
export function getCurrentISTDay(date: Date = new Date()): number {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: INDIAN_TZ }));
  return istDate.getDay();
}

export function formatForUserDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function toDateTimeLocal(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatOptimalTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatForUserDisplay(dateObj) + ' IST';
}


/**
 * Normalizes a URL to its canonical form for deduplication.
 * Removes query parameters, hash fragments, and trailing slashes.
 */
export function normalizeUrl(url: string): string {
  try {
      const parsedUrl = new URL(url);
      // Keep only protocol, host, and path
      return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/$/, ''); // Remove trailing slash
  } catch (e) {
      // Fallback for invalid URLs: remove query string and hash
      return url.split('?')[0].split('#')[0].replace(/\/$/, '');
  }
}