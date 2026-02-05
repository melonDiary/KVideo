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
}

export function IOSFullscreenVideoPlayer({
  src,
  title = '视频',
  poster,
  onBack,
  onError,
  onSuccess,
  options = {}
}: IOSFullscreenVideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [fullscreenResult, setFullscreenResult] = useState<PlaybackResult | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deviceInfo = useDeviceDetector();

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

  // 进入全屏
  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current) {
      setError('全屏容器未找到');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await IOSFullscreenExecutor.enterFullscreen(containerRef.current, 'native');
      // 转换 FullscreenResult 为 PlaybackResult
      const playbackResult: PlaybackResult = {
        success: result.success,
        method: 'native',
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
        throw new Error(result.error || '全屏失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '全屏失败';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  // 退出全屏
  const exitFullscreen = useCallback(async () => {
    if (!isFullscreen) return;

    setIsLoading(true);
    try {
      const result = await IOSFullscreenExecutor.exitFullscreen();
      
      if (result.success) {
        setIsFullscreen(false);
        console.log('iOS退出全屏成功');
      } else {
        console.warn('退出全屏失败:', result.error);
      }
    } catch (err) {
      console.error('退出全屏异常:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isFullscreen]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

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