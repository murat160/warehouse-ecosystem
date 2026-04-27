import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Объединяет CSS-классы, корректно мерджит конфликтующие Tailwind-классы. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
