import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Safe navigation back hook
 * Attempts to use browser history, falls back to predefined routes
 */
export function useSafeNavigateBack() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateBack = useCallback(
    (fallbackRoute: string = '/') => {
      try {
        // First try to use browser history
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          // Fallback to predefined route
          router.push(fallbackRoute);
        }
      } catch (error) {
        console.warn('Navigation back failed, using fallback:', error);
        // Final fallback
        router.push(fallbackRoute);
      }
    },
    [router]
  );

  const getFallbackRoute = useCallback(() => {
    // Define fallback routes based on current pathname
    switch (pathname) {
      case '/settings':
        return '/';
      case '/premium/settings':
        return '/premium';
      case '/player':
        return '/';
      case '/premium':
        return '/';
      default:
        return '/';
    }
  }, [pathname]);

  return {
    navigateBack,
    getFallbackRoute,
  };
}
