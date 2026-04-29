/**
 * Video Source Configuration and Management
 * Handles third-party video API sources with validation and health checks
 */

import type { VideoSource } from '@/lib/types';
import { DEFAULT_SOURCES } from './default-sources';
import { PREMIUM_SOURCES } from './premium-sources';

/**
 * Get all available video sources (both default and premium)
 */
export function getAllSources(): VideoSource[] {
  return [...DEFAULT_SOURCES, ...PREMIUM_SOURCES];
}

/**
 * Get only enabled sources
 */
export function getEnabledSources(sources: VideoSource[]): VideoSource[] {
  return sources.filter(source => source.enabled !== false);
}

/**
 * Get source by ID from both default and premium sources
 */
export function getSourceById(id: string): VideoSource | undefined {
  // Search in default sources first
  const defaultSource = DEFAULT_SOURCES.find(source => source.id === id);
  if (defaultSource) {
    return defaultSource;
  }

  // Search in premium sources
  return PREMIUM_SOURCES.find(source => source.id === id);
}

/**
 * Validate a video source configuration
 */
export function isValidSource(source: Partial<VideoSource>): boolean {
  return (
    typeof source.id === 'string' &&
    source.id.length > 0 &&
    typeof source.name === 'string' &&
    source.name.length > 0 &&
    typeof source.baseUrl === 'string' &&
    source.baseUrl.startsWith('http')
  );
}

/**
 * Sort sources by priority (higher priority first), then by name
 */
export function sortSourcesByPriority(sources: VideoSource[]): VideoSource[] {
  return [...sources].sort((a, b) => {
    // First sort by enabled status
    if (a.enabled === false && b.enabled !== false) return 1;
    if (a.enabled !== false && b.enabled === false) return -1;
    
    // Then by priority (higher priority first)
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    
    // Finally by name for consistent ordering
    return a.name.localeCompare(b.name);
  });
}
