/**
 * Latency Utilities
 * Provides latency measurement, formatting, and color-coded status indicators
 * Following Liquid Glass design system principles
 */

interface LatencyInfo {
  value: number;
  label: string;
  color: string;
  level: 'excellent' | 'good' | 'fair' | 'slow';
}

/**
 * Color codes for different latency levels (Liquid Glass design system)
 */
const LATENCY_COLORS = {
  excellent: '#34c759', // Green
  good: '#30d158',      // Light green
  fair: '#ff9500',      // Orange
  slow: '#ff3b30',      // Red
} as const;

/**
 * Thresholds for latency levels (in milliseconds)
 */
const LATENCY_THRESHOLDS = {
  excellent: 500,
  good: 1000,
  fair: 2000,
} as const;

/**
 * Get latency information with color coding and level classification
 * 
 * @param latency - Response time in milliseconds
 * @returns Formatted latency info with color and level
 * 
 * @example
 * ```ts
 * const info = getLatencyInfo(350);
 * // Returns: { value: 350, label: '350ms', color: '#34c759', level: 'excellent' }
 * ```
 */
export function getLatencyInfo(latency: number): LatencyInfo {
  let level: LatencyInfo['level'];
  let color: string;

  if (latency < LATENCY_THRESHOLDS.excellent) {
    level = 'excellent';
    color = LATENCY_COLORS.excellent;
  } else if (latency < LATENCY_THRESHOLDS.good) {
    level = 'good';
    color = LATENCY_COLORS.good;
  } else if (latency < LATENCY_THRESHOLDS.fair) {
    level = 'fair';
    color = LATENCY_COLORS.fair;
  } else {
    level = 'slow';
    color = LATENCY_COLORS.slow;
  }

  return {
    value: latency,
    label: formatLatency(latency),
    color,
    level,
  };
}

/**
 * Calculate average latency from an array of values
 * 
 * @param latencies - Array of latency values in milliseconds
 * @returns Average latency rounded to nearest integer, or 0 if empty array
 */
export function calculateAverageLatency(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / latencies.length);
}

/**
 * Calculate median latency from an array of values
 * 
 * @param latencies - Array of latency values in milliseconds
 * @returns Median latency rounded to nearest integer, or 0 if empty array
 */
export function calculateMedianLatency(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  
  const sorted = [...latencies].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Format latency for display
 * 
 * @param latency - Response time in milliseconds
 * @returns Formatted string in milliseconds (e.g., "345ms", "1240ms")
 */
export function formatLatency(latency: number): string {
  return `${Math.round(latency)}ms`;
}

/**
 * Check if latency is within acceptable range
 * 
 * @param latency - Response time in milliseconds
 * @param threshold - Maximum acceptable latency (default: 2000ms)
 * @returns true if latency is below threshold
 */
export function isLatencyAcceptable(latency: number, threshold: number = LATENCY_THRESHOLDS.fair): boolean {
  return latency < threshold;
}
