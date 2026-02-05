/**
 * iOS视频播放器React Hook和组件
 * 与KVideo项目集成的React组件
 */

import React, { useCallback, useEffect, useState } from 'react';
import { iosVideoPlayer } from './iosVideoPlayer';

// React Hook for iOS Video Player
export function useIOSVideoPlayer() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<PlaybackResult | null>(null);

  useEffect(() => {
    // 检测设备能力
    const caps = iosVideoPlayer.getCapabilities();
    setCapabilities(caps);
  }, []);

  const playVideo = useCallback(async (url: string, options?: VideoPlayerOptions) => {
    setIsPlaying(true);
    const result = await iosVideoPlayer.playVideo(url, options);
    setLastResult(result);
    setIsPlaying(false);
    return result;
  }, []);

  const downloadVideo = useCallback((url: string) => {
    return playVideo(url, { forceDownload: true });
  }, [playVideo]);

  const openInSafari = useCallback((url: string) => {
    return playVideo(url, { preferredPlayer: 'safari' });
  }, [playVideo]);

  return {
    capabilities,
    isPlaying,
    lastResult,
    playVideo,
    downloadVideo,
    openInSafari
  };
}

// iOS播放器状态显示组件
export function IOSPlayerStatus() {
  const { capabilities, lastResult } = useIOSVideoPlayer();

  if (!capabilities?.isIOS) {
    return (
      <div className="text-sm text-gray-500">
        设备不支持iOS播放器功能
      </div>
    );
  }

  return (
    <div className="text-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>iOS {capabilities.iOSVersion || '未知版本'}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${capabilities.hasNativeHLS ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span>原生HLS支持: {capabilities.hasNativeHLS ? '是' : '否'}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${capabilities.isStandalone ? 'bg-green-500' : 'bg-blue-500'}`}></span>
        <span>运行模式: {capabilities.isStandalone ? 'PWA' : '浏览器'}</span>
      </div>

      {lastResult && (
        <div className="text-xs text-gray-600">
          上次播放: {lastResult.method} - {lastResult.success ? '成功' : '失败'}
          {lastResult.player && ` (${lastResult.player})`}
        </div>
      )}
    </div>
  );
}

// iOS视频播放器按钮组件
interface IOSVideoPlayerButtonProps {
  videoUrl: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  options?: VideoPlayerOptions;
}

export function IOSVideoPlayerButton({
  videoUrl,
  className = '',
  variant = 'primary',
  size = 'md',
  showText = true,
  options = {}
}: IOSVideoPlayerButtonProps) {
  const { capabilities, playVideo } = useIOSVideoPlayer();
  const [isLoading, setIsLoading] = useState(false);

  // 按钮样式变体
  const buttonVariants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700'
  };

  const buttonSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const handlePlay = async () => {
    if (!capabilities?.isIOS) {
      // 非iOS设备回退到普通链接
      window.open(videoUrl, '_blank');
      return;
    }

    setIsLoading(true);
    try {
      const result = await playVideo(videoUrl, options);
      
      if (!result.success) {
        console.error('播放失败:', result.error);
        // 如果失败，回退到Safari
        window.open(videoUrl, '_blank');
      }
    } catch (error) {
      console.error('播放错误:', error);
      window.open(videoUrl, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (options.forceDownload) return '下载';
    if (options.preferredPlayer === 'safari') return 'Safari播放';
    if (options.preferredPlayer === 'vlc') return 'VLC播放';
    return 'iOS播放';
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-300
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          {showText && <span>处理中...</span>}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          {showText && <span>{getButtonText()}</span>}
        </>
      )}
    </button>
  );
}

// 批量视频播放组件
interface BatchVideoPlayerProps {
  videos: Array<{
    url: string;
    title?: string;
    options?: VideoPlayerOptions;
  }>;
  className?: string;
}

export function BatchVideoPlayer({ videos, className = '' }: BatchVideoPlayerProps) {
  const { playVideo } = useIOSVideoPlayer();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [results, setResults] = useState<PlaybackResult[]>([]);

  const playAll = async () => {
    setResults([]);
    
    for (let i = 0; i < videos.length; i++) {
      setPlayingIndex(i);
      const result = await playVideo(videos[i].url, videos[i].options);
      setResults(prev => [...prev, result]);
      
      // 延迟播放下一个
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setPlayingIndex(null);
  };

  const playWithDelay = async (index: number, delay: number = 2000) => {
    setPlayingIndex(index);
    const result = await playVideo(videos[index].url, videos[index].options);
    setResults(prev => [...prev, result]);
    
    setTimeout(() => setPlayingIndex(null), 500);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">批量播放器</h3>
        <button
          onClick={playAll}
          disabled={playingIndex !== null}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl transition-all duration-300"
        >
          全部播放 ({videos.length})
        </button>
      </div>

      <div className="space-y-2">
        {videos.map((video, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/20"
          >
            <div className="flex-1">
              <div className="text-white font-medium">
                {video.title || `视频 ${index + 1}`}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {video.url}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {results[index] && (
                <div className="text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    results[index].success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {results[index].success ? '成功' : '失败'}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => playWithDelay(index)}
                disabled={playingIndex !== null}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-all duration-300"
              >
                {playingIndex === index ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h4 className="text-sm font-semibold text-white mb-2">播放结果</h4>
          <div className="text-xs text-gray-400">
            成功: {results.filter(r => r.success).length} / {results.length}
          </div>
        </div>
      )}
    </div>
  );
}

// 视频播放器选择器组件
interface VideoPlayerSelectorProps {
  videoUrl: string;
  onPlayerSelected?: (player: string, result: PlaybackResult) => void;
  className?: string;
}

export function VideoPlayerSelector({ videoUrl, onPlayerSelected, className = '' }: VideoPlayerSelectorProps) {
  const { playVideo, capabilities } = useIOSVideoPlayer();
  const [loading, setLoading] = useState<string | null>(null);

  const players = [
    { id: 'auto', name: '智能选择', icon: '🧠' },
    { id: 'system', name: '系统播放器', icon: '📱' },
    { id: 'safari', name: 'Safari', icon: '🧭' },
    { id: 'youtube', name: 'YouTube', icon: '📺' },
    { id: 'vlc', name: 'VLC', icon: '▶️' },
    { id: 'download', name: '下载', icon: '⬇️' }
  ];

  const handlePlayerSelect = async (playerId: string) => {
    setLoading(playerId);
    
    const options: VideoPlayerOptions = {
      preferredPlayer: playerId as any,
      allowExternalPlayer: true
    };

    const result = await playVideo(videoUrl, options);
    onPlayerSelected?.(playerId, result);
    setLoading(null);
  };

  const recommendedPlayer = iosVideoPlayer.getRecommendedPlayer(videoUrl);
  const isIOS = capabilities?.isIOS;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-white">
        <div className="text-sm text-gray-400 mb-2">
          视频链接: <span className="text-blue-400 break-all">{videoUrl}</span>
        </div>
        <div className="text-sm text-gray-400">
          推荐播放器: <span className="text-green-400">{recommendedPlayer}</span>
        </div>
        {!isIOS && (
          <div className="text-xs text-orange-400 mt-1">
            非iOS设备，部分功能可能不可用
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {players.map(player => (
          <button
            key={player.id}
            onClick={() => handlePlayerSelect(player.id)}
            disabled={loading !== null}
            className={`
              p-3 rounded-xl border transition-all duration-300 text-left
              ${player.id === recommendedPlayer && isIOS
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }
              ${loading === player.id ? 'opacity-50' : 'hover:scale-105'}
              disabled:cursor-not-allowed
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{player.icon}</span>
              <div>
                <div className="font-medium text-sm">{player.name}</div>
                {loading === player.id && (
                  <div className="text-xs text-gray-400">启动中...</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// 导出默认组件
export default {
  useIOSVideoPlayer,
  IOSPlayerStatus,
  IOSVideoPlayerButton,
  BatchVideoPlayer,
  VideoPlayerSelector
};
