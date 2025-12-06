import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将 Date 对象格式化为本地时间的 YYYY-MM-DD 字符串。
 * 避免 toISOString() 带来的 UTC 偏移问题。
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将 YYYY-MM-DD 字符串解析为本地午夜时间的 Date 对象。
 * 避免 UTC 午夜导致的本地变更为前一天的问题。
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
