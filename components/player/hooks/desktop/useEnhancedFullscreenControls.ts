import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IOSFullscreenDetector, IOSFullscreenExecutor, IOSFullscreenInfo } from '@/lib/utils/ios-fullscreen-detector';

interface EnhancedFullscreenControlsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  isPiPSupported: boolean;
  isAirPlaySupported: boolean;
  setIsPiPSupported: (supported: boolean) => void;
  setIsAirPlaySupported: (supported: boolean) => void;
  fullscreenType?: 'native' | 'window' | 'auto';
  enableIOSOptimizations?: boolean;
}

interface FullscreenState {
  isFullscreen: boolean;
  method: string;
  isSupported: boolean;
  error?: string;
  canFallback: boolean;
}

export function useEnhancedFullscreenControls({
  containerRef,
  videoRef,
  isFullscreen,
  setIsFullscreen,
  isPiPSupported,
  isAirPlaySupported,
  setIsPiPSupported,
  setIsAirPlaySupported,
  fullscreenType = 'auto',
  enableIOSOptimizations = true
}: EnhancedFullscreenControlsProps) {
  
  const [fullscreenState, setFullscreenState] = useState<FullscreenState>({
    isFullscreen: false,
    method: 'none',
    isSupported: true,
    canFallback: true
  });

  const [iosInfo, setIosInfo] = useState<IOSFullscreenInfo>(() => IOSFullscreenDetector.detect());
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检测设备特性
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const hasNativePiP = 'pictureInPictureEnabled' in document;
      const hasWebkitPiP = videoRef.current && (
        'webkitSupportsPresentationMode' in (videoRef.current as any) ||
        'webkitPresentationMode' in (videoRef.current as any)
      );
      setIsPiPSupported(hasNativePiP || !!hasWebkitPiP);
    }
    
    if (typeof window !== 'undefined') {
      setIsAirPlaySupported('WebKitPlaybackTargetAvailabilityEvent' in window);
    }

    // 实时更新iOS信息
    const updateIOSInfo = () => {
      setIosInfo(IOSFullscreenDetector.detect());
    };
    
    window.addEventListener('resize', updateIOSInfo);
    window.addEventListener('orientationchange', updateIOSInfo);
    
    return () => {
      window.removeEventListener('resize', updateIOSInfo);
      window.removeEventListener('orientationchange', updateIOSInfo);
    };
  }, [setIsPiPSupported, setIsAirPlaySupported, videoRef]);

  // 取消进行中的全屏操作
  const cancelOngoingOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 增强的全屏切换方法
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    cancelOngoingOperation();
    abortControllerRef.current = new AbortController();

    try {
      if (!isFullscreen) {
        // 进入全屏
        if (enableIOSOptimizations && iosInfo.isIOS) {
          // iOS 特殊处理
          const method = fullscreenType === 'auto' ? iosInfo.bestMethod : fullscreenType as any;
          const result = await IOSFullscreenExecutor.enterFullscreen(containerRef.current, method);
          
          if (result.success) {
            setFullscreenState(prev => ({
              ...prev,
              isFullscreen: true,
              method: result.method,
              error: undefined
            }));
            setIsFullscreen(true);
            
            // iOS 17+ 优化
            if (iosInfo.iosVersion && parseFloat(iosInfo.iosVersion) >= 17.0) {
              document.body.style.webkitUserSelect = 'none';
              document.body.style.overflow = 'hidden';
            }
          } else {
            // 降级到网页全屏
            console.warn('iOS系统全屏失败，降级到网页全屏:', result.error);
            setIsFullscreen(true); // 网页全屏逻辑处理
          }
        } else {
          // 桌面端和Android处理
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
            (videoRef.current as any).webkitEnterFullscreen();
          }
        }
      } else {
        // 退出全屏
        if (enableIOSOptimizations && iosInfo.isIOS) {
          const result = await IOSFullscreenExecutor.exitFullscreen();
          if (result.success) {
            setFullscreenState(prev => ({
              ...prev,
              isFullscreen: false,
              method: 'none',
              error: undefined
            }));
            setIsFullscreen(false);
            
            // 恢复系统UI
            if (iosInfo.iosVersion && parseFloat(iosInfo.iosVersion) >= 17.0) {
              document.body.style.webkitUserSelect = '';
              document.body.style.overflow = '';
            }
          } else {
            // 使用标准方法退出
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            }
            setIsFullscreen(false);
          }
        } else {
          // 桌面端和Android处理
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
      }
    } catch (error) {
      console.error('全屏操作失败:', error);
      setFullscreenState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '未知错误'
      }));
      
      // 出错时尝试降级方案
      if (!isFullscreen) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    }
  }, [
    containerRef, 
    videoRef, 
    isFullscreen, 
    setIsFullscreen, 
    enableIOSOptimizations, 
    iosInfo, 
    fullscreenType,
    cancelOngoingOperation
  ]);

  // 全屏状态变化监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setFullscreenState(prev => ({
        ...prev,
        isFullscreen: isInFullscreen
      }));

      // 状态同步
      if (isInFullscreen !== isFullscreen) {
        setIsFullscreen(isInFullscreen);
      }

      // iOS 特殊处理
      if (iosInfo.isIOS) {
        if (isInFullscreen) {
          if (iosInfo.iosVersion && parseFloat(iosInfo.iosVersion) >= 17.0) {
            document.body.style.webkitUserSelect = 'none';
            document.body.style.overflow = 'hidden';
          }
        } else {
          document.body.style.webkitUserSelect = '';
          document.body.style.overflow = '';
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [setIsFullscreen, isFullscreen, iosInfo]);

  // 键盘快捷键处理
  useEffect(() => {
    if (isFullscreen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFullscreen();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, toggleFullscreen]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cancelOngoingOperation();
      // 清理样式
      document.body.style.webkitUserSelect = '';
      document.body.style.overflow = '';
    };
  }, [cancelOngoingOperation]);

  const fullscreenActions = useMemo(() => ({
    toggleFullscreen,
    togglePictureInPicture: async () => {
      if (!videoRef.current || !isPiPSupported) return;
      
      const video = videoRef.current as any;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (video.webkitPresentationMode === 'picture-in-picture') {
          video.webkitSetPresentationMode('inline');
        } else if (video.requestPictureInPicture) {
          await video.requestPictureInPicture();
        } else if (video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode('picture-in-picture')) {
          video.webkitSetPresentationMode('picture-in-picture');
        }
      } catch (error) {
        console.error('切换画中画失败:', error);
      }
    },
    showAirPlayMenu: () => {
      if (!videoRef.current || !isAirPlaySupported) return;
      const video = videoRef.current as any;
      if (video.webkitShowPlaybackTargetPicker) {
        video.webkitShowPlaybackTargetPicker();
      }
    }
  }), [toggleFullscreen, isPiPSupported, isAirPlaySupported]);

  return {
    ...fullscreenActions,
    fullscreenState,
    iosInfo,
    canUseNativeFullscreen: iosInfo.isSupported && iosInfo.isIOS
  };
}

// 兼容旧版本的Hook（逐步替换）
export function useFullscreenControlsLegacy({
    containerRef,
    videoRef,
    isFullscreen,
    setIsFullscreen,
    isPiPSupported,
    isAirPlaySupported,
    setIsPiPSupported,
    setIsAirPlaySupported,
    fullscreenType = 'native'
}: any) {
  return useEnhancedFullscreenControls({
    containerRef,
    videoRef,
    isFullscreen,
    setIsFullscreen,
    isPiPSupported,
    isAirPlaySupported,
    setIsPiPSupported,
    setIsAirPlaySupported,
    fullscreenType,
    enableIOSOptimizations: false // 暂时不启用iOS优化，保持向后兼容
  });
}