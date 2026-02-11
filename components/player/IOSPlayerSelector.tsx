'use client';

/**
 * iOS播放器选择器
 * 在主播放器中添加iOS播放器选项
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { useDeviceDetector } from '@/lib/utils/device-detector';
import { iosVideoPlayer } from '@/lib/ios/iosVideoPlayer';
import { settingsStore } from '@/lib/store/settings-store';
import type { VideoPlayerOptions, PlaybackResult } from '@/lib/ios/types';

interface IOSPlayerSelectorProps {
  src: string;
  title?: string;
  poster?: string;
  onIOSPlay?: (result: PlaybackResult) => void;
  onIOSError?: (error: string) => void;
  onBackToWeb?: () => void;
  className?: string;
  showWebPlayerFallback?: boolean;
}

export function IOSPlayerSelector({
  src,
  title = '视频',
  poster,
  onIOSPlay,
  onIOSError,
  onBackToWeb,
  className = '',
  showWebPlayerFallback = true
}: IOSPlayerSelectorProps) {
  const deviceInfo = useDeviceDetector();
  const [settings, setSettings] = useState(settingsStore.getSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayerChoices, setShowPlayerChoices] = useState(false);
  const [lastResult, setLastResult] = useState<PlaybackResult | null>(null);

  // 订阅设置变化
  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setSettings(settingsStore.getSettings());
    });
    return unsubscribe;
  }, []);

  // 检查是否应该在iOS设备上显示此组件
  const shouldShowIOSPlayer = deviceInfo.isIOS && (settings.preferSystemPlayer || deviceInfo.isMobile);

  if (!shouldShowIOSPlayer) {
    return null;
  }

  // 播放视频
  const handleIOSPlay = useCallback(async (playerType?: string) => {
    if (!src) {
      onIOSError?.('视频地址无效');
      return;
    }

    setIsLoading(true);
    try {
      const playOptions: VideoPlayerOptions = {
        preferredPlayer: playerType as any || settings.iosPlayerMode,
        enableNativeControls: true,
        allowExternalPlayer: true,
        fallbackToSafari: true
      };

      const result = await iosVideoPlayer.playVideo(src, playOptions);
      setLastResult(result);

      if (result.success) {
        onIOSPlay?.(result);
      } else {
        onIOSError?.(result.error || 'iOS播放器启动失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'iOS播放器启动失败';
      onIOSError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [src, settings, onIOSPlay, onIOSError]);

  // 获取推荐的播放器
  const getRecommendedPlayer = useCallback(() => {
    return iosVideoPlayer.getRecommendedPlayer(src);
  }, [src]);

  // 自动播放推荐播放器
  const handleAutoPlay = useCallback(async () => {
    const recommended = getRecommendedPlayer();
    await handleIOSPlay(recommended);
  }, [getRecommendedPlayer, handleIOSPlay]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 主要iOS播放器提示 */}
      <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">📱</span>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              iOS系统播放器
            </h3>
            <p className="text-sm text-muted-foreground">
              为您的{deviceInfo.isIPad ? 'iPad' : 'iPhone'}优化的播放器体验
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleAutoPlay}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Icons.RefreshCw size={18} className="animate-spin" />
              ) : (
                <Icons.Play size={18} />
              )}
              智能播放
            </Button>
            
            <Button
              onClick={() => setShowPlayerChoices(!showPlayerChoices)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Icons.Settings size={18} />
              选择播放器
            </Button>
          </div>
        </div>
      </Card>

      {/* 播放器选择面板 */}
      {showPlayerChoices && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">选择播放器</h4>
              <Button
                onClick={() => setShowPlayerChoices(false)}
                variant="ghost"
              >
                <Icons.X size={16} />
              </Button>
            </div>

            <div className="grid gap-3">
              {/* 智能选择 */}
              <button
                onClick={() => handleIOSPlay('auto')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-accent/50 bg-accent/5 text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">智能选择</span>
                      <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                        推荐
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      根据视频格式自动选择最佳播放器
                    </p>
                  </div>
                </div>
              </button>

              {/* 系统播放器 */}
              <button
                onClick={() => handleIOSPlay('system')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🖥️</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">系统播放器</div>
                    <p className="text-sm text-muted-foreground">
                      使用iOS原生播放器，支持HLS和硬件解码
                    </p>
                  </div>
                </div>
              </button>

              {/* Safari */}
              <button
                onClick={() => handleIOSPlay('safari')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌐</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">Safari浏览器</div>
                    <p className="text-sm text-muted-foreground">
                      在Safari中打开播放
                    </p>
                  </div>
                </div>
              </button>

              {/* YouTube */}
              <button
                onClick={() => handleIOSPlay('youtube')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📺</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">YouTube</div>
                    <p className="text-sm text-muted-foreground">
                      如果是YouTube视频，跳转到YouTube应用
                    </p>
                  </div>
                </div>
              </button>

              {/* VLC */}
              <button
                onClick={() => handleIOSPlay('vlc')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎬</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">VLC播放器</div>
                    <p className="text-sm text-muted-foreground">
                      需要安装VLC播放器应用
                    </p>
                  </div>
                </div>
              </button>

              {/* 网页播放器 */}
              <button
                onClick={() => handleIOSPlay('web')}
                disabled={isLoading}
                className="p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💻</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">网页播放器</div>
                    <p className="text-sm text-muted-foreground">
                      在当前页面中播放视频，支持更多控制选项
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Web播放器回退选项 */}
      {showWebPlayerFallback && onBackToWeb && (
        <Card className="p-4 border-border bg-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white mb-1">网页播放器</div>
              <div className="text-sm text-muted-foreground">
                使用浏览器内嵌播放器
              </div>
            </div>
            <Button
              onClick={onBackToWeb}
              variant="secondary"
            >
              返回网页播放器
            </Button>
          </div>
        </Card>
      )}

      {/* 播放结果提示 */}
      {lastResult && (
        <Card className={`p-4 border ${
          lastResult.success 
            ? 'border-green-500/20 bg-green-500/10' 
            : 'border-red-500/20 bg-red-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <span className={lastResult.success ? 'text-green-400' : 'text-red-400'}>
              {lastResult.success ? '✅' : '❌'}
            </span>
            <div className="flex-1">
              <div className={`font-medium ${
                lastResult.success ? 'text-green-300' : 'text-red-300'
              }`}>
                {lastResult.success ? '播放器启动成功' : '播放器启动失败'}
              </div>
              <div className={`text-sm ${
                lastResult.success ? 'text-green-200/80' : 'text-red-200/80'
              }`}>
                使用 {lastResult.player} - {lastResult.method}
                {lastResult.error && ` (${lastResult.error})`}
              </div>
            </div>
            <Button
              onClick={() => setLastResult(null)}
              variant="ghost"
            >
              <Icons.X size={16} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
