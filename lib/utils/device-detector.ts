/**
 * 设备检测工具
 * 检测是否为iOS设备以及设备能力
 */

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  hasNativeHLS: boolean;
  hasWKWebView: boolean;
  isStandalone: boolean;
  iOSVersion: string | null;
  supportsAirPlay: boolean;
  supportsPictureInPicture: boolean;
  browserName: string;
  browserVersion: string;
}

export class DeviceDetector {
  private static instance: DeviceDetector;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {
    this.detectDevice();
  }

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * 检测设备信息
   */
  private detectDevice(): DeviceInfo {
    if (typeof window === 'undefined') {
      return this.getDefaultDeviceInfo();
    }

    const userAgent = navigator.userAgent;
    const deviceInfo: DeviceInfo = {
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isIPad: (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || /iPad/.test(userAgent),
      isIPhone: /iPhone/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      isDesktop: !/iPad|iPhone|iPod|Android/.test(userAgent),
      isMobile: /iPad|iPhone|iPod|Android/.test(userAgent),
      hasNativeHLS: this.supportsNativeHLS(),
      hasWKWebView: 'webkit' in window,
      isStandalone: 'standalone' in window.navigator && (window.navigator as any).standalone,
      iOSVersion: this.getiOSVersion(userAgent),
      supportsAirPlay: /iPad|iPhone|iPod/.test(userAgent),
      supportsPictureInPicture: document.pictureInPictureEnabled,
      browserName: this.getBrowserName(userAgent),
      browserVersion: this.getBrowserVersion(userAgent)
    };

    this.deviceInfo = deviceInfo;
    return deviceInfo;
  }

  /**
   * 获取默认设备信息（服务端）
   */
  private getDefaultDeviceInfo(): DeviceInfo {
    return {
      isIOS: false,
      isIPad: false,
      isIPhone: false,
      isAndroid: false,
      isDesktop: true,
      isMobile: false,
      hasNativeHLS: false,
      hasWKWebView: false,
      isStandalone: false,
      iOSVersion: null,
      supportsAirPlay: false,
      supportsPictureInPicture: false,
      browserName: 'Unknown',
      browserVersion: '0'
    };
  }

  /**
   * 检测是否支持原生HLS
   */
  private supportsNativeHLS(): boolean {
    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  /**
   * 获取iOS版本
   */
  private getiOSVersion(userAgent: string): string | null {
    const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    return match ? `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}` : null;
  }

  /**
   * 获取浏览器名称
   */
  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * 获取浏览器版本
   */
  private getBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(Chrome|Safari|Firefox|Edge)\/(\d+)/);
    return match ? match[2] : '0';
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      return this.detectDevice();
    }
    return this.deviceInfo;
  }

  /**
   * 检测是否为iOS设备
   */
  isIOSDevice(): boolean {
    return this.getDeviceInfo().isIOS;
  }

  /**
   * 检测是否应该使用iOS系统播放器
   */
  shouldUseIOSPlayer(): boolean {
    const info = this.getDeviceInfo();
    return info.isIOS && info.isMobile;
  }

  /**
   * 获取推荐的播放器类型
   */
  getRecommendedPlayer(videoUrl: string): string {
    const info = this.getDeviceInfo();
    
    // YouTube视频
    if (this.isYouTubeVideo(videoUrl)) {
      return 'youtube';
    }

    // iOS设备
    if (info.isIOS) {
      const extension = this.getFileExtension(videoUrl);
      
      // HLS直播流
      if (extension === 'm3u8') {
        return 'system';
      }
      
      // 常见视频格式
      if (['mp4', 'mov', 'm4v'].includes(extension)) {
        return 'system';
      }
      
      // 大文件或特殊格式
      if (['mkv', 'avi', 'wmv'].includes(extension)) {
        return 'vlc';
      }
    }
    
    // 默认返回
    return 'safari';
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
   * 获取文件扩展名
   */
  private getFileExtension(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop()?.toLowerCase();
      return extension || '';
    } catch {
      return '';
    }
  }
}

// React Hook
export function useDeviceDetector(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    return DeviceDetector.getInstance().getDeviceInfo();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDeviceInfo = () => {
      setDeviceInfo(DeviceDetector.getInstance().getDeviceInfo());
    };

    // 监听设备变化
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

// 导出单例
export const deviceDetector = DeviceDetector.getInstance();
