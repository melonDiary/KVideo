'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IOSFullscreenExecutor } from '@/lib/utils/ios-fullscreen-detector';
import { iosVideoPlayer } from '@/lib/ios/iosVideoPlayer';
import { useDeviceDetector } from '@/lib/utils/device-detector';
import type {
  VideoPlayerOptions,
  PlaybackResult,
  DeviceCapabilities
} from '@/lib/ios/types';
import '@/components/player/ios-fullscreen.css';

interface IOSFullscreenVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onBack?: () => void;
  onError?: (error: string) => void;
  onSuccess?: (result: PlaybackResult) => void;
  options?: VideoPlayerOptions;
  totalEpisodes?: number;
  currentEpisodeIndex?: number;
  onNextEpisode?: () => void;
  isReversed?: boolean;
}

export function IOSFullscreenVideoPlayer({
  src,
  title = '视频',
  poster,
  onBack,
  onError,
  onSuccess,
  options = {},
  totalEpisodes,
  currentEpisodeIndex,
  onNextEpisode,
  isReversed = false
}: IOSFullscreenVideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [fullscreenResult, setFullscreenResult] = useState<PlaybackResult | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  
  // 新增：用户交互状态追踪
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deviceInfo = useDeviceDetector();

  // 新增：用户交互验证机制
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const markAsInteracted = () => {
      setHasUserInteracted(true);
      console.log('iOS全屏播放器: 用户已交互');
    };

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

  // 检查设备兼容性
  if (!deviceInfo.isIOS) {
    return (
      <div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl">
        <div className="text-red-600">
          <h3 className="font-semibold">非iOS设备</h3>
          <p className="text-sm mt-1">iOS全屏播放器仅支持iPhone和iPad</p>
        </div>
      </div>
    );
  }

  // 初始化设备能力
  useEffect(() => {
    const caps = iosVideoPlayer.getCapabilities();
    setCapabilities(caps);
  }, []);

  // 增强的进入全屏逻辑
  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current) {
      setError('全屏容器未找到');
      return false;
    }

    // 关键修复：检查用户交互状态
    if (!hasUserInteracted) {
      const friendlyMessage = '请点击屏幕任意位置后再尝试全屏';
      setError(''); // 清除之前的错误
      console.warn('iOS全屏: 用户未交互，阻止全屏请求');
      
      // 显示友好的提示而非错误
      showUserFriendlyMessage(friendlyMessage);
      return false;
    }

    setIsLoading(true);
    setError(''); // 清除错误状态

    try {
      console.log('开始iOS全屏流程...');
      const result = await IOSFullscreenExecutor.enterFullscreen(containerRef.current, 'native');
      
      // 转换 FullscreenResult 为 PlaybackResult
      const playbackResult: PlaybackResult = {
        success: result.success,
        method: result.success ? 'safari' : 'failed', // 修正method类型
        player: result.method,
        originalUrl: src,
        error: result.error
      };
      
      setFullscreenResult(playbackResult);
      
      if (result.success) {
        setIsFullscreen(true);
        console.log('iOS全屏成功:', result.method);
        onSuccess?.(playbackResult);
        return true;
      } else {
        // 智能降级：不直接抛出错误，而是尝试其他方案
        console.warn('iOS原生全屏失败，尝试降级方案:', result.error);
        
        // 降级方案：使用CSS全屏
        const cssFallbackResult = await tryCSSFallback();
        if (cssFallbackResult.success) {
          setIsFullscreen(true);
          showUserFriendlyMessage('已启用网页全屏模式');
          onSuccess?.(cssFallbackResult);
          return true;
        }
        
        throw new Error(result.error || '全屏启动失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '全屏失败';
      console.error('iOS全屏异常:', err);
      
      // 不直接设置错误，而是提供解决方案
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, src, hasUserInteracted]);

  // 新增：CSS降级方案
  const tryCSSFallback = useCallback(async (): Promise<PlaybackResult> => {
    if (!containerRef.current) {
      return {
        success: false,
        method: 'failed',
        originalUrl: src,
        error: '容器不存在'
      };
    }

    try {
      const element = containerRef.current;
      
      // 保存原始样式
      const originalStyle = {
        position: element.style.position,
        top: element.style.top,
        left: element.style.left,
        width: element.style.width,
        height: element.style.height,
        zIndex: element.style.zIndex,
        margin: element.style.margin,
        padding: element.style.padding,
        borderRadius: element.style.borderRadius,
        overflow: element.style.overflow
      };

      // 应用全屏样式
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100vw';
      element.style.height = '100vh';
      element.style.zIndex = '2147483647';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.borderRadius = '0';
      element.style.overflow = 'hidden';

      // 等待样式生效
      await new Promise(resolve => setTimeout(resolve, 150));

      return {
        success: true,
        method: 'safari',
        player: 'CSS-Fallback',
        originalUrl: src
      };

    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: src,
        error: `CSS降级失败: ${error}`
      };
    }
  }, [src]);

  // 新增：友好提示函数
  const showUserFriendlyMessage = useCallback((message: string) => {
    if (typeof window === 'undefined') return;

    // 移除现有提示
    const existingToast = document.getElementById('ios-friendly-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'ios-friendly-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 122, 255, 0.95);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      z-index: 999999;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
      animation: fadeInOut 4s ease-in-out forwards;
      max-width: 80vw;
      text-align: center;
    `;
    
    // 添加动画样式
    if (!document.getElementById('ios-friendly-toast-style')) {
      const style = document.createElement('style');
      style.id = 'ios-friendly-toast-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          15%, 85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    
    // 4秒后自动移除
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.remove();
      }
    }, 4000);
  }, []);

  // 增强的退出全屏逻辑
  const exitFullscreen = useCallback(async () => {
    console.log('开始退出全屏...', { currentFullscreen: isFullscreen });

    setIsLoading(true);
    
    try {
      // 首先使用标准API
      const result = await IOSFullscreenExecutor.exitFullscreen();
      
      if (result.success) {
        console.log('标准退出方法成功:', result.method);
        setIsFullscreen(false);
      } else {
        console.warn('标准退出方法失败，尝试降级方案:', result.error);
        
        // 降级方案1: 尝试所有可能的退出方法
        const fallbackMethods = [
          async () => {
            if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
              return { success: true, method: 'webkitExitFullscreen' };
            }
            return { success: false };
          },
          async () => {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
              return { success: true, method: 'exitFullscreen' };
            }
            return { success: false };
          },
          async () => {
            // 尝试模拟ESC键
            document.dispatchEvent(new KeyboardEvent('keydown', { 
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              bubbles: true
            }));
            return { success: true, method: 'ESC_simulation' };
          }
        ];

        // 逐一尝试降级方法
        for (const method of fallbackMethods) {
          try {
            const fallbackResult = await method();
            if (fallbackResult.success) {
              console.log('降级退出方法成功:', fallbackResult.method);
              setIsFullscreen(false);
              return;
            }
          } catch (err) {
            console.warn('降级方法失败:', err);
          }
        }

        // 如果所有方法都失败，强制重置状态
        console.warn('所有退出方法都失败，强制重置状态');
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('退出全屏异常:', err);
      // 异常情况下也重置状态
      setIsFullscreen(false);
    } finally {
      setIsLoading(false);
    }
  }, [isFullscreen]);

  // 增强的全屏状态验证
  const validateFullscreenState = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );

    // 如果状态不一致，强制同步
    if (isCurrentlyFullscreen !== isFullscreen) {
      console.log('iOS全屏状态同步:', { 
        actual: isCurrentlyFullscreen, 
        current: isFullscreen 
      });
      setIsFullscreen(isCurrentlyFullscreen);
    }

    return isCurrentlyFullscreen;
  }, [isFullscreen]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      validateFullscreenState();
    };

    // 立即验证一次
    validateFullscreenState();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [validateFullscreenState]);

  // 定期状态验证，防止状态漂移
  useEffect(() => {
    if (!isFullscreen) return;

    const interval = setInterval(() => {
      validateFullscreenState();
    }, 1000); // 每秒验证一次

    return () => clearInterval(interval);
  }, [isFullscreen, validateFullscreenState]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, exitFullscreen]);

  // 播放视频
  const handlePlayVideo = useCallback(async (preferredPlayer?: string) => {
    if (!src) {
      const msg = '视频地址无效';
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const playOptions: VideoPlayerOptions = {
        ...options,
        preferredPlayer: preferredPlayer as any || 'auto'
      };

      const result = await iosVideoPlayer.playVideo(src, playOptions);
      
      if (result.success) {
        // 如果是系统播放器且设备支持，尝试进入全屏
        if ((result.player === 'system' || preferredPlayer === 'system') && !isFullscreen && capabilities?.hasNativeHLS) {
          // 延迟一点时间让系统播放器启动
          setTimeout(() => {
            enterFullscreen();
          }, 1500);
        }
        onSuccess?.(result);
      } else {
        throw new Error(result.error || '播放失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '播放失败';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [src, options, isFullscreen, capabilities, enterFullscreen, onError, onSuccess]);

  // 显示播放器选择器
  const showSelector = () => {
    setShowPlayerSelector(true);
  };

  // 隐藏播放器选择器
  const hideSelector = () => {
    setShowPlayerSelector(false);
  };

  // 全屏控制按钮
  const FullscreenControls = () => (
    <div className="ios-fullscreen-controls absolute top-4 right-4 z-50 flex gap-2">
      {!isFullscreen && (
        <>
          <button
            onClick={showSelector}
            className="ios-touch-optimized p-3 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
            title="选择播放器"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </button>
          
          {/* 新增：播放下一集按钮 */}
          {onNextEpisode && totalEpisodes && currentEpisodeIndex !== undefined && (
            <button
              onClick={() => {
                console.log('手动播放下一集');
                onNextEpisode();
              }}
              className="ios-touch-optimized p-3 bg-green-600/80 hover:bg-green-700 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
              title={`播放下一集 (${currentEpisodeIndex + 1}/${totalEpisodes})`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
          )}
          
          <button
            onClick={enterFullscreen}
            disabled={isLoading}
            className="ios-touch-optimized p-3 bg-blue-600/80 hover:bg-blue-700 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
            title="进入全屏"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </>
      )}
      
      {isFullscreen && (
        <div className="flex gap-2">
          {/* 全屏模式下的播放下一集按钮 */}
          {onNextEpisode && totalEpisodes && currentEpisodeIndex !== undefined && (
            <button
              onClick={() => {
                console.log('全屏模式下播放下一集');
                onNextEpisode();
              }}
              className="ios-touch-optimized p-3 bg-green-600/80 hover:bg-green-700 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
              title={`播放下一集 (${currentEpisodeIndex + 1}/${totalEpisodes})`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
          )}
          
          <button
            onClick={exitFullscreen}
            disabled={isLoading}
            className="ios-touch-optimized p-3 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
            title="退出全屏"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          </button>
        </div>
      )}
      
      {onBack && (
        <button
          onClick={onBack}
          disabled={isLoading}
          className="ios-touch-optimized p-3 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-all duration-200"
          title="返回"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      )}
    </div>
  );

  // 播放器选择器
  const PlayerSelector = () => (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">选择播放器</h3>
          <button
            onClick={hideSelector}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => { handlePlayVideo('system'); hideSelector(); }}
            className="w-full p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div>
                <div className="font-medium text-white">系统播放器</div>
                <div className="text-sm text-blue-200/80">原生iOS播放器，支持全屏</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => { handlePlayVideo('safari'); hideSelector(); }}
            className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="font-medium text-white">Safari浏览器</div>
                <div className="text-sm text-gray-300/80">在Safari中播放视频</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => { handlePlayVideo('youtube'); hideSelector(); }}
            className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📺</span>
              <div>
                <div className="font-medium text-white">YouTube</div>
                <div className="text-sm text-gray-300/80">使用YouTube应用播放</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => { handlePlayVideo('vlc'); hideSelector(); }}
            className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <div className="font-medium text-white">VLC播放器</div>
                <div className="text-sm text-gray-300/80">使用VLC应用播放</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden ${
        isFullscreen 
          ? 'ios-native-fullscreen fixed inset-0 z-[2147483647] ios-performance-mode' 
          : 'aspect-video'
      }`}
    >
      {/* 全屏控制栏 */}
      <FullscreenControls />
      
      {/* iOS全屏状态指示器 */}
      {isFullscreen && (
        <div className={`ios-fullscreen-indicator ${isFullscreen ? 'show' : ''}`}>
          iOS全屏模式 ({fullscreenResult?.method || '未知'})
        </div>
      )}
      
      {/* 加载状态 */}
      {isLoading && (
        <div className="ios-loading-overlay absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-white text-sm">
              {isFullscreen ? '正在进入全屏...' : '正在启动播放器...'}
            </p>
          </div>
        </div>
      )}
      
      {/* 播放器选择器 */}
      {showPlayerSelector && <PlayerSelector />}
      
      {/* 错误提示 */}
      {error && !showPlayerSelector && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">播放错误</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handlePlayVideo('auto')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                重试
              </button>
              <button
                onClick={showSelector}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                选择播放器
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  返回
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 设备能力信息（非全屏时显示） */}
      {!isFullscreen && !showPlayerSelector && !error && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center justify-between text-sm text-white/80">
            <div className="flex items-center gap-4">
              <span>HLS: {capabilities?.hasNativeHLS ? '✓' : '✗'}</span>
              <span>PiP: {capabilities?.supportsPictureInPicture ? '✓' : '✗'}</span>
              <span>AirPlay: {capabilities?.supportsAirPlay ? '✓' : '✗'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={showSelector}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
              >
                选择
              </button>
              <button
                onClick={() => handlePlayVideo('system')}
                disabled={isLoading}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs transition-colors"
              >
                系统播放
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 隐藏的video元素，用于某些全屏方法 */}
      <video
        ref={videoRef}
        className="hidden"
        controls={false}
        preload="metadata"
        src={src}
      />
    </div>
  );
}