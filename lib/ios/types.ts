/**
 * iOS播放器类型定义
 * 用于解决Cloudflare编译时的类型导入冲突问题
 */

/**
 * 视频播放器配置选项
 */
export interface VideoPlayerOptions {
  forceDownload?: boolean;
  preferredPlayer?: 'auto' | 'system' | 'safari' | 'vlc' | 'youtube';
  enableNativeControls?: boolean;
  allowExternalPlayer?: boolean;
  fallbackToSafari?: boolean;
}

/**
 * 视频信息接口
 */
export interface VideoInfo {
  url: string;
  extension?: string;
  isLive?: boolean;
  size?: number;
  quality?: string[];
  mimeType?: string;
}

/**
 * 播放结果接口
 */
export interface PlaybackResult {
  success: boolean;
  method: 'safari' | 'urlscheme' | 'download' | 'native' | 'failed';
  player?: string;
  error?: string;
  originalUrl: string;
}

/**
 * 设备能力接口
 */
export interface DeviceCapabilities {
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  hasNativeHLS: boolean;
  hasWKWebView: boolean;
  hasFileAPI: boolean;
  hasNotificationAPI: boolean;
  hasDownloadAPI: boolean;
  isStandalone: boolean;
  iOSVersion: string | null;
  supportsPictureInPicture: boolean;
  supportsAirPlay: boolean;
}