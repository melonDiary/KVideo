'use client';

/**
 * iOS系统播放器组件
 * 为iOS设备提供原生播放器集成
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icon';
import { useDeviceDetector } from '@/lib/utils/device-detector';
import { iosVideoPlayer } from '@/lib/ios/iosVideoPlayer';
import type { VideoPlayerOptions, PlaybackResult, DeviceCapabilities } from '@/lib/ios/types';

interface IOSVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onError?: (error: string) => void;
  onSuccess?: (result: PlaybackResult) => void;
  options?: VideoPlayerOptions;
  className?: string;
}

export function IOSVideoPlayer({
  src,
  title = '视频',
  poster,
  onError,
  onSuccess,
  options = {},
  className = ''
}: IOSVideoPlayerProps) {
  const deviceInfo = useDeviceDetector();
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [recommendedPlayer, setRecommendedPlayer] = useState<string>('');
  const [lastResult, setLastResult] = useState<PlaybackResult | null>(null);

  // 初始化设备能力检测
  useEffect(() => {
    if (deviceInfo.isIOS) {
      const caps = iosVideoPlayer.getCapabilities();
      setCapabilities(caps);
      setRecommendedPlayer(iosVideoPlayer.getRecommendedPlayer(src));
    }
  }, [deviceInfo.isIOS, src]);

  // 检查设备兼容性
  if (!deviceInfo.isIOS) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
            <Icons.AlertTriangle size={32} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-orange-400 mb-2">非iOS设备</h3>
            <p className="text-sm text-muted-foreground">
              iOS系统播放器仅在iPhone和iPad上可用
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // 播放视频
  const handlePlayVideo = useCallback(async (playerType?: string) => {
    if (!src) {
      onError?.('视频地址无效');
      return;
    }

    setIsLoading(true);
    try {
      const playOptions: VideoPlayerOptions = {
        ...options,
        preferredPlayer: playerType as any || 'auto'
      };

      const result = await iosVideoPlayer.playVideo(src, playOptions);
      setLastResult(result);

      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || '播放失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '播放失败';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [src, options, onError, onSuccess]);

  // 获取播放器选项
  const getPlayerOptions = () => {
    const options = [
      {
        id: 'auto',
        name: '智能选择',
        description: '自动选择最佳播放器',
        icon: '🤖',
        recommended: true
      },
      {
        id: 'system',
        name: '系统播放器',
        description: '使用iOS原生播放器',
        icon: '🖥️',
        recommended: capabilities?.hasNativeHLS
      },
      {
        id: 'safari',
        name: 'Safari浏览器',
        description: '在Safari中播放',
        icon: '🌐',
        recommended: false
      },
      {
        id: 'youtube',
        name: 'YouTube',
        description: '用YouTube应用播放',
        icon: '📺',
        recommended: false
      },
      {
        id: 'vlc',
        name: 'VLC播放器',
        description: '使用VLC应用播放',
        icon: '🎬',
        recommended: false
      }
    ];

    return options;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* 设备信息 */}
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">iOS系统播放器</h2>
          <p className="text-sm text-muted-foreground">
            为您的{getiOSVersionText()}设备优化的播放器
          </p>
        </div>

        {/* 设备能力信息 */}
        {capabilities && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h3 className="font-medium text-blue-300 mb-3">设备能力</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${capabilities.hasNativeHLS ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-blue-200/80">HLS支持</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${capabilities.hasWKWebView ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-blue-200/80">WKWebView</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${capabilities.supportsAirPlay ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-blue-200/80">AirPlay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${capabilities.supportsPictureInPicture ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-blue-200/80">画中画</span>
              </div>
            </div>
          </div>
        )}

        {/* 推荐播放器 */}
        {recommendedPlayer && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400">💡</span>
              <h3 className="font-medium text-green-300">推荐播放器</h3>
            </div>
            <p className="text-sm text-green-200/80">
              根据视频格式推荐使用：<span className="font-medium">{getPlayerDisplayName(recommendedPlayer)}</span>
            </p>
          </div>
        )}

        {/* 播放器选择 */}
        <div>
          <h3 className="font-medium text-white mb-4">选择播放器</h3>
          <div className="grid gap-3">
            {getPlayerOptions().map((option) => (
              <button
                key={option.id}
                onClick={() => handlePlayVideo(option.id)}
                disabled={isLoading}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-accent/10 cursor-pointer'
                } ${
                  option.recommended
                    ? 'border-accent/50 bg-accent/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{option.name}</span>
                      {option.recommended && (
                        <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                          推荐
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                  {isLoading && (
                    <div className="animate-spin">
                      <Icons.Loader2 size={20} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 视频信息 */}
        <div className="bg-muted/10 rounded-xl p-4">
          <h4 className="font-medium text-white mb-2">视频信息</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>标题: {title}</div>
            <div>地址: {src.length > 50 ? `${src.substring(0, 50)}...` : src}</div>
            <div>iOS版本: {deviceInfo.iOSVersion || '未知'}</div>
          </div>
        </div>

        {/* 上次播放结果 */}
        {lastResult && (
          <div className={`border rounded-xl p-4 ${
            lastResult.success 
              ? 'border-green-500/20 bg-green-500/10' 
              : 'border-red-500/20 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={lastResult.success ? 'text-green-400' : 'text-red-400'}>
                {lastResult.success ? '✅' : '❌'}
              </span>
              <h4 className={`font-medium ${lastResult.success ? 'text-green-300' : 'text-red-300'}`}>
                上次播放结果
              </h4>
            </div>
            <div className={`text-sm ${lastResult.success ? 'text-green-200/80' : 'text-red-200/80'}`}>
              <div>方法: {lastResult.method}</div>
              <div>播放器: {lastResult.player}</div>
              {lastResult.error && <div>错误: {lastResult.error}</div>}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// 获取iOS版本显示文本
function getiOSVersionText(): string {
  if (typeof window === 'undefined') return '';
  const userAgent = navigator.userAgent;
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/iPhone/.test(userAgent)) return 'iPhone';
  return 'iOS';
}

// 获取播放器显示名称
function getPlayerDisplayName(playerType: string): string {
  const names: Record<string, string> = {
    auto: '智能选择',
    system: '系统播放器',
    safari: 'Safari浏览器',
    youtube: 'YouTube',
    vlc: 'VLC播放器'
  };
  return names[playerType] || playerType;
}
