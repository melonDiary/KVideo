'use client';

import { useState, useEffect } from 'react';
import { DesktopVideoPlayer } from './DesktopVideoPlayer';
import { IOSFullscreenVideoPlayer } from '@/components/player/IOSFullscreenVideoPlayer';
import { useDeviceDetector } from '@/lib/utils/device-detector';
import { settingsStore } from '@/lib/store/settings-store';
import type { PlaybackResult } from '@/lib/ios/types';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  shouldAutoPlay?: boolean;
  // Episode navigation props for auto-skip/auto-next
  totalEpisodes?: number;
  currentEpisodeIndex?: number;
  onNextEpisode?: () => void;
  isReversed?: boolean;
  title?: string;
}

/**
 * Smart Video Player that renders different versions based on device
 * - iOS: iOS全屏播放器with native player integration
 * - Desktop: Full-featured player with hover interactions
 */
export function CustomVideoPlayer({
  src,
  poster,
  onError,
  onTimeUpdate,
  initialTime,
  shouldAutoPlay,
  totalEpisodes,
  currentEpisodeIndex,
  onNextEpisode,
  isReversed,
  title
}: CustomVideoPlayerProps) {
  const deviceInfo = useDeviceDetector();
  const [settings, setSettings] = useState(settingsStore.getSettings());

  // 订阅设置变化
  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setSettings(settingsStore.getSettings());
    });
    return unsubscribe;
  }, []);

  // 决定是否使用iOS播放器
  // 方案A: 版本自适应策略
  // iOS 17+: 默认使用iOS播放器（新功能优先）
  // iOS 16.x及以下: 默认使用网页播放器（兼容性优先）
  const shouldUseIOSPlayer = deviceInfo.isIOS && (
    settings.iosPlayerMode === 'system' || 
    settings.iosPlayerMode === 'safari' ||
    (settings.iosPlayerMode === 'auto' && (
      deviceInfo.isIOS17OrAbove === true || 
      (deviceInfo.isIOS17OrAbove === false && settings.preferSystemPlayer)
    ))
  );

  // iOS设备处理
  if (deviceInfo.isIOS && shouldUseIOSPlayer) {
    return (
      <IOSFullscreenVideoPlayer
        src={src}
        title={title}
        poster={poster}
        onError={onError}
        onSuccess={(result) => {
          console.log('iOS播放器启动成功:', result);
        }}
        options={{
          preferredPlayer: settings.iosPlayerMode,
          enableNativeControls: true,
          allowExternalPlayer: true
        }}
      />
    );
  }

  // 默认使用桌面播放器
  return (
    <DesktopVideoPlayer
      src={src}
      poster={poster}
      onError={onError}
      onTimeUpdate={onTimeUpdate}
      initialTime={initialTime}
      shouldAutoPlay={shouldAutoPlay}
      totalEpisodes={totalEpisodes}
      currentEpisodeIndex={currentEpisodeIndex}
      onNextEpisode={onNextEpisode}
      isReversed={isReversed}
    />
  );
}
