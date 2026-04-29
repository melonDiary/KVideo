/**
 * API Client for fetching video data from multiple sources
 * Handles parallel requests and data normalization
 */

export { searchVideos } from './search-api';
export { getVideoDetail } from './detail-api';
export { parseEpisodes } from './parsers';
export { fetchWithTimeout, withRetry } from './http-utils';
export { 
  getAllSources, 
  getEnabledSources, 
  getSourceById, 
  isValidSource, 
  sortSourcesByPriority 
} from './video-sources';

// Re-export type definitions
export type { VideoSource, SourceSubscription } from '@/lib/types';
