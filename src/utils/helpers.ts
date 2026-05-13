// ============================================
// Helpers - Shared Utility Functions
// ============================================

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extract JSON from Claude's response text (handles markdown code blocks)
 */
export function extractJsonFromResponse(response: string): string {
  // Try to find JSON in code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON (starts with { or [)
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Return as-is
  return response.trim();
}

/**
 * Format a date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  try {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Format a date to ISO 8601
 */
export function formatTimestamp(date: Date): string {
  try {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  try {
    if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
      return 0;
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay);
  } catch (e) {
    return 0;
  }
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  try {
    const result = new Date(date);
    if (isNaN(result.getTime())) {
      return new Date();
    }
    result.setDate(result.getDate() + days);
    return result;
  } catch (e) {
    return new Date();
  }
}

/**
 * Calculate percentage change
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return parseFloat((((newValue - oldValue) / oldValue) * 100).toFixed(2));
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Generate a version string from revision number
 */
export function generateVersion(revisionNumber: number): string {
  if (revisionNumber === 0) return 'v1.0';
  return `v1.${revisionNumber}`;
}

/**
 * Truncate string for display
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;
  return { result, durationMs };
}
