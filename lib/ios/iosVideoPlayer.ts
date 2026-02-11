/**
 * iOS视频播放器调用工具库
 * 用于在Web环境中调用iOS系统播放器
 * 
 * @author KVideo Team
 * @version 1.0.0
 */

import type {
  VideoPlayerOptions,
  VideoInfo,
  PlaybackResult,
  DeviceCapabilities
} from './types';

// 重新导出所有React组件和Hook
export {
  useIOSVideoPlayer,
  IOSVideoPlayerButton,
  IOSPlayerStatus,
  BatchVideoPlayer,
  VideoPlayerSelector
} from './react-components';

// 导出类型
export type {
  VideoPlayerOptions,
  VideoInfo,
  PlaybackResult,
  DeviceCapabilities
};

/**
 * iOS视频播放器管理器
 */
export class IOSVideoPlayer {
  private static instance: IOSVideoPlayer;
  private callbacks = new Map<string, Function[]>();
  private capabilities: DeviceCapabilities | null = null;

  private constructor() {
    this.detectCapabilities();
  }

  static getInstance(): IOSVideoPlayer {
    if (!IOSVideoPlayer.instance) {
      IOSVideoPlayer.instance = new IOSVideoPlayer();
    }
    return IOSVideoPlayer.instance;
  }

  /**
   * 检测设备能力
   */
  private async detectCapabilities(): Promise<void> {
    this.capabilities = {
      isIOS: this.isIOS(),
      isIPad: this.isIPad(),
      isIPhone: this.isIPhone(),
      hasNativeHLS: this.supportsNativeHLS(),
      hasWKWebView: 'webkit' in window,
      hasFileAPI: 'URL' in window,
      hasNotificationAPI: 'Notification' in window,
      hasDownloadAPI: 'download' in document.createElement('a'),
      isStandalone: this.isStandalone(),
      iOSVersion: this.getiOSVersion(),
      supportsPictureInPicture: this.supportsPictureInPicture(),
      supportsAirPlay: this.supportsAirPlay()
    };
  }

  /**
   * 检测是否为iOS设备
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * 检测是否为iPad
   */
  private isIPad(): boolean {
    return (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || 
           /iPad/.test(navigator.userAgent);
  }

  /**
   * 检测是否为iPhone
   */
  private isIPhone(): boolean {
    return /iPhone/.test(navigator.userAgent);
  }

  /**
   * 检测是否支持原生HLS
   */
  private supportsNativeHLS(): boolean {
    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  /**
   * 检测是否为PWA模式
   */
  private isStandalone(): boolean {
    return 'standalone' in window.navigator && (window.navigator as any).standalone;
  }

  /**
   * 获取iOS版本
   */
  private getiOSVersion(): string | null {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    return match ? `${match[1]}.${match[2]}.${match[3] || '0'}` : null;
  }

  /**
   * 检测是否支持画中画
   */
  private supportsPictureInPicture(): boolean {
    return document.pictureInPictureEnabled;
  }

  /**
   * 检测是否支持AirPlay
   */
  private supportsAirPlay(): boolean {
    // iOS原生支持AirPlay，可以通过特定方式检测
    return this.isIOS();
  }

  /**
   * 主要播放方法
   */
  async playVideo(url: string, options: VideoPlayerOptions = {}): Promise<PlaybackResult> {
    if (!this.capabilities) {
      await this.detectCapabilities();
    }

    if (!this.capabilities?.isIOS) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Device is not iOS'
      };
    }

    try {
      // 1. 分析视频信息
      const videoInfo = await this.analyzeVideo(url);
      
      // 2. 选择最佳播放器
      const playerChoice = this.selectOptimalPlayer(videoInfo, options);
      
      // 3. 执行播放
      const result = await this.launchPlayer(playerChoice, url, videoInfo);
      
      // 4. 触发回调
      this.triggerCallbacks('videoLaunched', { url, player: playerChoice, result });
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        method: 'failed' as const,
        originalUrl: url,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.triggerCallbacks('videoError', { url, error });
      return errorResult;
    }
  }

  /**
   * 分析视频信息
   */
  private async analyzeVideo(url: string): Promise<VideoInfo> {
    const urlObj = new URL(url);
    const extension = urlObj.pathname.split('.').pop()?.toLowerCase();
    const info: VideoInfo = { url, extension };

    try {
      // 检测M3U8内容
      if (extension === 'm3u8') {
        info.isLive = await this.detectIfLiveStream(url);
        info.quality = await this.extractVideoQualities(url);
      }

      // 获取文件大小
      const size = await this.getFileSize(url);
      if (size) info.size = size;

      // 检测MIME类型
      info.mimeType = this.getMimeType(extension);

    } catch (error) {
      console.warn('Failed to analyze video:', error);
    }

    return info;
  }

  /**
   * 检测是否为直播流
   */
  private async detectIfLiveStream(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const text = response.ok ? await response.text() : '';
      return text.includes('#EXT-X-STREAM-INF') || text.includes('live');
    } catch {
      return false;
    }
  }

  /**
   * 提取视频质量信息
   */
  private async extractVideoQualities(url: string): Promise<string[]> {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const qualities: string[] = [];
      
      const regex = /#EXT-X-STREAM-INF:.*?BANDWIDTH=(\d+)/g;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const bandwidth = parseInt(match[1]);
        if (bandwidth > 0) {
          qualities.push(`${Math.round(bandwidth / 1000)}k`);
        }
      }
      
      return qualities.sort((a, b) => {
        const aBandwidth = parseInt(a.replace('k', ''));
        const bBandwidth = parseInt(b.replace('k', ''));
        return bBandwidth - aBandwidth;
      });
    } catch {
      return [];
    }
  }

  /**
   * 获取文件大小
   */
  private async getFileSize(url: string): Promise<number | null> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(extension?: string): string {
    switch (extension) {
      case 'mp4':
      case 'm4v':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'm3u8':
        return 'application/vnd.apple.mpegurl';
      case 'avi':
        return 'video/x-msvideo';
      case 'mkv':
        return 'video/x-matroska';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 选择最佳播放器
   */
  private selectOptimalPlayer(videoInfo: VideoInfo, options: VideoPlayerOptions): string {
    const { preferredPlayer = 'auto' } = options;

    // 如果用户指定了特定播放器
    if (preferredPlayer !== 'auto') {
      return preferredPlayer;
    }

    // YouTube检测
    if (this.isYouTubeVideo(videoInfo.url)) {
      return 'youtube';
    }

    // 直播流检测
    if (videoInfo.isLive) {
      return this.capabilities?.hasNativeHLS ? 'system' : 'safari';
    }

    // 大文件或特殊格式检测
    if (this.shouldUseThirdPartyPlayer(videoInfo)) {
      return options.allowExternalPlayer ? 'vlc' : 'system';
    }

    // 默认选择网页播放器而不是系统播放器
    return 'web';
  }

  /**
   * 检测是否为YouTube视频
   */
  private isYouTubeVideo(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.toLowerCase();
      return host.includes('youtube.com') || host.includes('youtu.be');
    } catch {
      return false;
    }
  }

  /**
   * 检测是否应该使用第三方播放器
   */
  private shouldUseThirdPartyPlayer(videoInfo: VideoInfo): boolean {
    const largeFormats = ['mkv', 'avi', 'wmv', 'flv'];
    return (videoInfo.extension && largeFormats.includes(videoInfo.extension)) ||
           (videoInfo.size !== undefined && videoInfo.size > 500 * 1024 * 1024); // > 500MB
  }

  /**
   * 启动播放器
   */
  private async launchPlayer(playerChoice: string, url: string, videoInfo: VideoInfo): Promise<PlaybackResult> {
    switch (playerChoice) {
      case 'system':
        return this.launchSystemPlayer(url);
      case 'safari':
        return this.launchSafariPlayer(url);
      case 'web':
        return this.launchWebPlayer(url);
      case 'youtube':
        return this.launchYouTubePlayer(url);
      case 'vlc':
        return this.launchVLCPlayer(url);
      case 'download':
        return this.downloadVideo(url);
      default:
        return this.launchDefaultPlayer(url);
    }
  }

  /**
   * 启动系统播放器
   */
  private async launchSystemPlayer(url: string): Promise<PlaybackResult> {
    try {
      // 尝试使用WKWebView桥接
      if (this.capabilities?.hasWKWebView && (window as any).webkit?.messageHandlers?.player) {
        (window as any).webkit.messageHandlers.player.postMessage({
          action: 'play',
          url: url,
          options: { useNativePlayer: true }
        });

        return {
          success: true,
          method: 'native',
          player: 'AVPlayer',
          originalUrl: url
        };
      } else {
        // 回退到Safari
        return this.launchSafariPlayer(url);
      }
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to launch native player'
      };
    }
  }

  /**
   * 启动Safari播放器
   */
  private launchSafariPlayer(url: string): PlaybackResult {
    try {
      // 创建下载链接，Safari会自动识别并弹出播放器选择
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // 使用setTimeout避免立即执行的阻止
      setTimeout(() => {
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 100);
      }, 0);

      return {
        success: true,
        method: 'safari',
        player: 'Safari',
        originalUrl: url
      };
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to launch Safari player'
      };
    }
  }

  /**
   * 启动网页播放器
   */
  private launchWebPlayer(url: string): PlaybackResult {
    try {
      // 触发自定义事件，告诉页面使用网页播放器
      const event = new CustomEvent('kvideo-play-web-player', {
        detail: { url: url }
      });
      window.dispatchEvent(event);

      return {
        success: true,
        method: 'web',
        player: 'WebPlayer',
        originalUrl: url
      };
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to launch web player'
      };
    }
  }

  /**
   * 启动YouTube播放器
   */
  private launchYouTubePlayer(url: string): PlaybackResult {
    const videoId = this.extractYouTubeID(url);
    if (videoId) {
      const youtubeURL = `https://www.youtube.com/watch?v=${videoId}`;
      return this.launchSafariPlayer(youtubeURL);
    }
    return this.launchSafariPlayer(url);
  }

  /**
   * 启动VLC播放器
   */
  private launchVLCPlayer(url: string): PlaybackResult {
    const vlcURL = `vlc://${url}`;
    
    try {
      // 创建隐藏iframe触发URL scheme
      const iframe = document.createElement('iframe');
      iframe.src = vlcURL;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);

      return {
        success: true,
        method: 'urlscheme',
        player: 'VLC',
        originalUrl: url
      };
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to launch VLC player'
      };
    }
  }

  /**
   * 下载视频
   */
  private downloadVideo(url: string): PlaybackResult {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getFileName(url);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        method: 'download',
        player: 'Download',
        originalUrl: url
      };
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to download video'
      };
    }
  }

  /**
   * 默认播放器（回退方案）
   */
  private launchDefaultPlayer(url: string): PlaybackResult {
    // 尝试在当前窗口打开
    try {
      window.location.href = url;
      return {
        success: true,
        method: 'safari',
        player: 'Default',
        originalUrl: url
      };
    } catch (error) {
      return {
        success: false,
        method: 'failed',
        originalUrl: url,
        error: 'Failed to open default player'
      };
    }
  }

  /**
   * 提取YouTube视频ID
   */
  private extractYouTubeID(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      
      if (urlObj.hostname.includes('youtube.com')) {
        // 标准YouTube URL
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return videoId;
        
        // 处理短链接格式
        const pathMatch = urlObj.pathname.match(/\/shorts\/([^/?]+)/);
        if (pathMatch) return pathMatch[1];
        
        // 处理嵌入URL
        const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
        if (embedMatch) return embedMatch[1];
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取文件名
   */
  private getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'video.mp4';
    } catch {
      return 'video.mp4';
    }
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发回调
   */
  private triggerCallbacks(event: string, data: any): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Callback error:', error);
      }
    });
  }

  /**
   * 获取设备能力信息
   */
  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  /**
   * 批量播放视频
   */
  async playMultipleVideos(videos: Array<{url: string, options?: VideoPlayerOptions}>, delay: number = 1000): Promise<PlaybackResult[]> {
    const results: PlaybackResult[] = [];
    
    for (const video of videos) {
      const result = await this.playVideo(video.url, video.options);
      results.push(result);
      
      // 延迟播放下一个视频
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * 预加载视频
   */
  async preloadVideo(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取推荐播放器
   */
  getRecommendedPlayer(videoUrl: string): string {
    const extension = new URL(videoUrl).pathname.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'm3u8':
        return this.capabilities?.hasNativeHLS ? 'system' : 'web';
      case 'mp4':
      case 'mov':
      case 'm4v':
        return 'web'; // 默认使用网页播放器
      case 'mkv':
      case 'avi':
        return 'vlc';
      default:
        return 'web';
    }
  }
}

/**
 * 设备能力接口
 */

// 导出单例实例
export const iosVideoPlayer = IOSVideoPlayer.getInstance();

// 便捷函数
export const playVideo = (url: string, options?: VideoPlayerOptions) => 
  iosVideoPlayer.playVideo(url, options);

export const downloadVideo = (url: string) => 
  iosVideoPlayer.playVideo(url, { forceDownload: true });

export const openInSafari = (url: string) => 
  iosVideoPlayer.playVideo(url, { preferredPlayer: 'safari' });
