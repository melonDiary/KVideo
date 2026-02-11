'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { useHistory } from '@/lib/store/history-store';
import { settingsStore } from '@/lib/store/settings-store';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { IOSFullscreenVideoPlayer } from './IOSFullscreenVideoPlayer';
import { VideoPlayerError } from './VideoPlayerError';
import { VideoPlayerEmpty } from './VideoPlayerEmpty';
import { useDeviceDetector } from '@/lib/utils/device-detector';
import { iosVideoPlayer } from '@/lib/ios/iosVideoPlayer';
import type { PlaybackResult } from '@/lib/ios/types';

interface VideoPlayerProps {
  playUrl: string;
  videoId?: string;
  currentEpisode: number;
  onBack: () => void;
  // Episode navigation props for auto-skip/auto-next
  totalEpisodes?: number;
  onNextEpisode?: () => void;
  isReversed?: boolean;
  isPremium?: boolean;
}

export function VideoPlayer({
  playUrl,
  videoId,
  currentEpisode,
  onBack,
  totalEpisodes,
  onNextEpisode,
  isReversed = false,
  isPremium = false
}: VideoPlayerProps) {
  const [videoError, setVideoError] = useState<string>('');
  const [useProxy, setUseProxy] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [settings, setSettings] = useState(settingsStore.getSettings());
  const deviceInfo = useDeviceDetector();
  const MAX_MANUAL_RETRIES = 20;
  const lastSaveTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const SAVE_INTERVAL = 5000; // 5 seconds throttle

  // Get showModeIndicator setting
  const [showModeIndicator, setShowModeIndicator] = useState(false);
  const [proxyMode, setProxyMode] = useState<'retry' | 'none' | 'always'>('retry');

  useEffect(() => {
    // Initial value
    const currentSettings = settingsStore.getSettings();
    setSettings(currentSettings);
    setShowModeIndicator(currentSettings.showModeIndicator);
    setProxyMode(currentSettings.proxyMode);

    // Subscribe to changes
    const unsubscribe = settingsStore.subscribe(() => {
      const newSettings = settingsStore.getSettings();
      setSettings(newSettings);
      setShowModeIndicator(newSettings.showModeIndicator);
      setProxyMode(newSettings.proxyMode);
    });

    return () => unsubscribe();
  }, []);

  // Initialize useProxy based on proxyMode when the component mounts or proxyMode changes
  useEffect(() => {
    if (proxyMode === 'always') {
      setUseProxy(true);
    } else if (proxyMode === 'none') {
      setUseProxy(false);
    }
  }, [proxyMode]);

  // Use reactive hook to subscribe to history updates
  const { viewingHistory, addToHistory } = useHistory(isPremium);
  const searchParams = useSearchParams();

  // Get video metadata from URL params
  const source = searchParams.get('source') || '';
  const title = searchParams.get('title') || '未知视频';

  // Get saved progress for this video
  const getSavedProgress = () => {
    if (!videoId) return 0;

    const historyItem = viewingHistory.find(item =>
      item.videoId.toString() === videoId?.toString() &&
      item.episodeIndex === currentEpisode &&
      (source ? item.source === source : true)
    ) || viewingHistory.find(item =>
      item.videoId.toString() === videoId?.toString() &&
      item.episodeIndex === currentEpisode
    );

    return historyItem ? historyItem.playbackPosition : 0;
  };

  // Save progress function (used by throttle and beforeunload)
  const saveProgress = useCallback((currentTime: number, duration: number) => {
    if (!videoId || !playUrl || duration === 0 || currentTime <= 1) return;
    addToHistory(
      videoId,
      title,
      playUrl,
      currentEpisode,
      source,
      currentTime,
      duration,
      undefined,
      []
    );
  }, [videoId, playUrl, title, currentEpisode, source, addToHistory]);

  // Handle time updates and save progress (throttled to every 5 seconds)
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    // Always track current time for beforeunload
    currentTimeRef.current = currentTime;
    durationRef.current = duration;

    if (!videoId || !playUrl || duration === 0) return;

    const now = Date.now();
    if (currentTime > 1 && now - lastSaveTimeRef.current >= SAVE_INTERVAL) {
      lastSaveTimeRef.current = now;
      saveProgress(currentTime, duration);
    }
  }, [videoId, playUrl, saveProgress]);

  // Save on page leave/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 1 && durationRef.current > 0) {
        saveProgress(currentTimeRef.current, durationRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  // Handle video errors
  const handleVideoError = (error: string) => {
    console.error('Video playback error:', error);

    // 特殊处理：切换到网页播放器的请求
    if (error === 'switching-to-web') {
      console.log('切换到网页播放器模式');
      setVideoError('');
      return;
    }

    if (!useProxy && proxyMode === 'retry') {
      setUseProxy(true);
      setShouldAutoPlay(true);
      setVideoError('');
      return;
    }

    setVideoError(error);
  };

  const handleRetry = () => {
    if (retryCount >= MAX_MANUAL_RETRIES) return;

    setRetryCount(prev => prev + 1);
    setVideoError('');
    setShouldAutoPlay(true);
    setUseProxy(prev => !prev);
  };

  // 处理iOS播放器成功/失败
  const handleIOSPlaySuccess = (result: PlaybackResult) => {
    console.log('iOS播放器成功启动:', result);
    
    // 如果选择的是网页播放器，切换回网页播放器
    if (result.method === 'web') {
      console.log('用户选择网页播放器，切换到网页播放器');
      setVideoError('switching-to-web');
      return;
    }
    
    // iOS播放器启动成功，不需要显示错误
    // 可以在这里添加成功提示
  };

  const handleIOSPlayError = (error: string) => {
    console.warn('iOS播放器启动失败:', error);
    // iOS播放器失败时，回退到网页播放器
    setVideoError(error);
  };

  const finalPlayUrl = useProxy || proxyMode === 'always'
    ? `/api/proxy?url=${encodeURIComponent(playUrl)}&retry=${retryCount}`
    : playUrl;

  // 决定使用哪种播放器
  // 修改：给iOS用户选择权，默认使用网页播放器而不是强制系统播放器
  const shouldUseIOSPlayer = deviceInfo.isIOS && (
    settings.iosPlayerMode === 'system' || 
    settings.iosPlayerMode === 'safari' ||
    (settings.iosPlayerMode === 'auto' && settings.preferSystemPlayer)
  );

  if (!playUrl) {
    return <VideoPlayerEmpty />;
  }

  return (
    <Card hover={false} className="p-0 relative">
      {/* Mode Indicator Badge */}
      {showModeIndicator && (
        <div className="absolute top-3 right-3 z-30">
          <span className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-md transition-all duration-300 ${useProxy
            ? 'bg-orange-500/80 text-white'
            : 'bg-green-500/80 text-white'
            }`}>
            {useProxy ? '代理模式' : '直连模式'}
          </span>
        </div>
      )}
      
      {videoError ? (
        <VideoPlayerError
          error={videoError}
          onBack={onBack}
          onRetry={handleRetry}
          retryCount={retryCount}
          maxRetries={MAX_MANUAL_RETRIES}
        />
      ) : shouldUseIOSPlayer ? (
        // 使用iOS全屏播放器
        <IOSFullscreenVideoPlayer
          src={finalPlayUrl}
          title={title}
          onBack={onBack}
          onSuccess={handleIOSPlaySuccess}
          onError={handleIOSPlayError}
          options={{
            preferredPlayer: settings.iosPlayerMode,
            enableNativeControls: true,
            allowExternalPlayer: true
          }}
        />
      ) : (
        // 使用网页播放器
        <CustomVideoPlayer
          key={`${useProxy ? 'proxy' : 'direct'}-${retryCount}-${source}`}
          src={finalPlayUrl}
          title={title}
          onError={handleVideoError}
          onTimeUpdate={handleTimeUpdate}
          initialTime={getSavedProgress()}
          shouldAutoPlay={shouldAutoPlay}
          totalEpisodes={totalEpisodes}
          currentEpisodeIndex={currentEpisode}
          onNextEpisode={onNextEpisode}
          isReversed={isReversed}
        />
      )}
    </Card>
  );
}
