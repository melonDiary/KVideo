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

  // 新增：用户交互状态追踪
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // 新增：用户交互验证机制
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const markAsInteracted = () => {
      setHasUserInteracted(true);
      console.log('iOS全屏: 用户已交互，可以触发全屏');
    };

    // 监听多种用户交互事件
    const interactionEvents = ['click', 'touchstart', 'keydown', 'pointerdown'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, markAsInteracted, { once: true, passive: true });
    });

    return () => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, markAsInteracted);
      });
    };
  }, []);

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

  // 获取当前实际的全屏状态（优先使用浏览器原生状态）
  const getCurrentFullscreenState = useCallback(() => {
    const nativeFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    return nativeFullscreen;
  }, []);

  // 新增：友好的错误提示函数
  const showUserFriendlyError = useCallback((message: string) => {
    if (typeof window !== 'undefined') {
      // 创建临时提示元素
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 999999;
        backdrop-filter: blur(10px);
        animation: fadeInOut 3s ease-in-out forwards;
      `;
      
      // 添加样式动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(toast);
      
      // 3秒后自动移除
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 3000);
    }
  }, []);

  // 增强的全屏切换方法
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    // 检查用户交互状态（关键修复）
    if (enableIOSOptimizations && iosInfo.isIOS && !hasUserInteracted) {
      showUserFriendlyError('请点击屏幕任意位置后再尝试全屏');
      console.warn('iOS全屏: 用户未交互，阻止全屏请求');
      return;
    }

    cancelOngoingOperation();
    abortControllerRef.current = new AbortController();

    // 获取当前实际状态（优先使用浏览器原生状态）
    const currentNativeState = getCurrentFullscreenState();
    const shouldEnterFullscreen = !currentNativeState;

    try {
      if (shouldEnterFullscreen) {
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
            // 立即同步React状态
            setTimeout(() => setIsFullscreen(true), 0);
            
            // iOS 17+ 优化
            if (iosInfo.iosVersion && parseFloat(iosInfo.iosVersion) >= 17.0) {
              document.body.style.webkitUserSelect = 'none';
              document.body.style.overflow = 'hidden';
            }
          } else {
            // 智能降级到网页全屏（替代失败提示）
            console.warn('iOS系统全屏失败，自动降级到网页全屏:', result.error);
            setIsFullscreen(true); // 网页全屏逻辑处理
            showUserFriendlyError('已启用网页全屏模式');
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
          // 等待状态变化事件同步React状态
          setTimeout(() => {
            const newNativeState = getCurrentFullscreenState();
            setIsFullscreen(newNativeState);
          }, 100);
        }
      } else {
        // 退出全屏 - 修复Windows端问题
        if (enableIOSOptimizations && iosInfo.isIOS) {
          const result = await IOSFullscreenExecutor.exitFullscreen();
          if (result.success) {
            setFullscreenState(prev => ({
              ...prev,
              isFullscreen: false,
              method: 'none',
              error: undefined
            }));
            setTimeout(() => setIsFullscreen(false), 0);
            
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
            // 立即同步React状态
            setTimeout(() => setIsFullscreen(false), 0);
          }
        } else {
          // 桌面端和Android处理 - 重点修复Windows端
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
          // 立即同步React状态，防止状态不同步
          setTimeout(() => {
            const newNativeState = getCurrentFullscreenState();
            setIsFullscreen(newNativeState);
          }, 0);
        }
      }
    } catch (error) {
      console.error('全屏操作失败:', error);
      setFullscreenState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '未知错误'
      }));
      
      // 出错时智能降级方案
      if (!currentNativeState) {
        // 进入全屏失败，但不应该阻止用户体验
        setIsFullscreen(true);
        showUserFriendlyError('全屏启动中...');
      } else {
        // 退出全屏失败，强制同步状态
        setTimeout(() => {
          const newNativeState = getCurrentFullscreenState();
          setIsFullscreen(newNativeState);
        }, 0);
      }
    }
  }, [
    containerRef, 
    videoRef, 
    setIsFullscreen, 
    enableIOSOptimizations, 
    iosInfo, 
    fullscreenType,
    cancelOngoingOperation,
    getCurrentFullscreenState,
    hasUserInteracted,
    showUserFriendlyError
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