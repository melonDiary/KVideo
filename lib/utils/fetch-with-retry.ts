/**
 * Fetch with Retry Utility
 * Handles HTTP requests with automatic retry logic and exponential backoff
 * Specifically designed for Next.js API routes with proxy functionality
 */

import { NextRequest } from 'next/server';

interface FetchWithRetryOptions {
  url: string;
  request: NextRequest;
  headers?: Record<string, string>;
}

/**
 * Common User-Agent strings for rotation to avoid blocking
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
] as const;

/**
 * Configuration constants
 */
const MAX_RETRIES = 5;
const TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_FORWARDED_IP = '202.108.22.5'; // Beijing IP as default

/**
 * Perform HTTP fetch with automatic retry and exponential backoff
 * 
 * Features:
 * - User-Agent rotation to avoid detection
 * - Smart Referer header using video domain
 * - Optional IP forwarding
 * - Exponential backoff on retries (100ms, 200ms, 400ms, 800ms, 1600ms)
 * - Timeout protection
 * 
 * @param options - Fetch configuration options
 * @param options.url - Target URL to fetch
 * @param options.request - Next.js request object for header extraction
 * @param options.headers - Additional headers to include
 * @returns Response object (may be non-OK status)
 * @throws Error if all retry attempts fail
 */
export async function fetchWithRetry({
  url,
  request,
  headers = {},
}: FetchWithRetryOptions): Promise<Response> {
  // Rotate User-Agent for better compatibility and anti-blocking
  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  // Smart Referer: use video domain instead of kvideo.vercel.app
  const videoUrl = new URL(url);
  const referer =
    request.nextUrl.searchParams.get('referer') ||
    `${videoUrl.protocol}//${videoUrl.hostname}`;

  // Optional IP forwarding (default: Beijing IP)
  const forwardedIP =
    request.nextUrl.searchParams.get('ip') || DEFAULT_FORWARDED_IP;

  let lastError: unknown = null;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      const backoffDelay = attempt > 1 ? Math.pow(2, attempt - 2) * 100 : 0;
      if (backoffDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      response = await fetch(url, {
        headers: {
          ...headers, // First: forwarded headers (Cookie, Range)
          // Then override with anti-blocking headers (these take precedence)
          'User-Agent': randomUA,
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'X-Forwarded-For': forwardedIP,
          'Client-IP': forwardedIP,
          Referer: referer,
          Origin: `${videoUrl.protocol}//${videoUrl.hostname}`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        break;
      }

      // Special handling for 503 Service Unavailable
      if (response.status === 503 && attempt < MAX_RETRIES) {
        console.warn(
          `⚠ Got 503 on attempt ${attempt}, retrying with backoff ${backoffDelay}ms...`
        );
        lastError = `503 on attempt ${attempt}`;
        continue;
      }

      console.warn(`✗ Got ${response.status} on attempt ${attempt}`);
      break;
    } catch (fetchError) {
      lastError = fetchError;

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`⚠ Timeout on attempt ${attempt}, retrying...`);
      } else if (attempt < MAX_RETRIES) {
        console.warn(`⚠ Fetch error on attempt ${attempt}, retrying...`, fetchError);
      } else {
        throw fetchError;
      }
    }
  }

  // If we got a response (even an error response like 403, 404), return it
  // Only throw if we truly failed to get any response
  if (!response) {
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError}`);
  }

  // Return the response even if it's an error status (403, 404, etc.)
  // The caller can check response.ok or response.status
  if (!response.ok) {
    console.warn(`⚠ Returning non-OK response: ${response.status} ${response.statusText}`);
  }

  return response;
}
