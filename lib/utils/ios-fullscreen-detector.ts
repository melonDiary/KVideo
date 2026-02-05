import { useState, useEffect } from 'react';

export interface IOSFullscreenInfo {
  isIOS: boolean;
  iosVersion: string | null;
  isSupported: boolean;
  bestMethod: 'native' | 'webkit' | 'video' | 'fallback';
  availableMethods: string[];
  recommendations: string[];
}

export interface FullscreenResult {
  success: boolean;
  method: string;
  error?: string;
  fallbackAvailable: boolean;
}

export class IOSFullscreenDetector {
  private static readonly SUPPORTED_METHODS = [
    'showSystemUI',
    'webkitRequestFullscreen',
    'webkitEnterFullscreen',
    'requestFullscreen'
  ];

  public static detect(): IOSFullscreenInfo {
    if (typeof window === 'undefined') {
      return {
        isIOS: false,
        iosVersion: null,
        isSupported: true,
        bestMethod: 'native',
        availableMethods: [],
        recommendations: ['服务端环境']
      };
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const iosVersion = this.extractIOSVersion(userAgent);
    
    if (!isIOS) {
      return {
        isIOS: false,
        iosVersion: null,
        isSupported: true,
        bestMethod: 'native',
        availableMethods: ['requestFullscreen'],
        recommendations: ['使用标准全屏API']
      };
    }

    const availableMethods = this.getAvailableMethods();
    const bestMethod = this.determineBestMethod(iosVersion, availableMethods);
    const recommendations = this.generateRecommendations(iosVersion, availableMethods);

    return {
      isIOS: true,
      iosVersion,
      isSupported: availableMethods.length > 0,
      bestMethod,
      availableMethods,
      recommendations
    };
  }

  private static extractIOSVersion(userAgent: string): string | null {
    const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    return match ? `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}` : null;
  }

  private static getAvailableMethods(): string[] {
    const methods: string[] = [];
    const testElement = document.createElement('div');
    const testVideo = document.createElement('video');

    // 检测现代全屏API
    if ('requestFullscreen' in testElement) {
      methods.push('requestFullscreen');
    }

    // 检测iOS 17+ API
    if ('showSystemUI' in testElement) {
      methods.push('showSystemUI');
    }

    // 检测webkit前缀API
    if ('webkitRequestFullscreen' in testElement) {
      methods.push('webkitRequestFullscreen');
    }

    // 检测video元素全屏
    if ('webkitEnterFullscreen' in testVideo) {
      methods.push('webkitEnterFullscreen');
    }

    return methods;
  }

  private static determineBestMethod(
    iosVersion: string | null, 
    methods: string[]
  ): 'native' | 'webkit' | 'video' | 'fallback' {
    if (!iosVersion) return 'fallback';

    const version = parseFloat(iosVersion);
    
    // iOS 17+ 优先使用原生API
    if (version >= 17.0 && methods.includes('showSystemUI')) {
      return 'native';
    }
    
    // iOS 15+ 优先使用webkit API
    if (version >= 15.0 && methods.includes('webkitRequestFullscreen')) {
      return 'webkit';
    }
    
    // 降级到video全屏
    if (methods.includes('webkitEnterFullscreen')) {
      return 'video';
    }
    
    return 'fallback';
  }

  private static generateRecommendations(
    iosVersion: string | null,
    methods: string[]
  ): string[] {
    if (!iosVersion) return ['设备信息获取失败，使用默认处理'];

    const version = parseFloat(iosVersion);
    const recommendations: string[] = [];

    if (version >= 17.0) {
      recommendations.push('建议使用iOS 17+原生全屏API');
      recommendations.push('支持完全隐藏状态栏');
    } else if (version >= 15.0) {
      recommendations.push('建议使用webkit全屏API');
      recommendations.push('全屏效果良好，部分系统UI可能可见');
    } else {
      recommendations.push('建议使用优化的网页全屏');
      recommendations.push('兼容性好但无法完全隐藏系统UI');
    }

    if (methods.includes('showSystemUI')) {
      recommendations.push('检测到系统API支持，推荐启用真全屏');
    }

    return recommendations;
  }
}

export class IOSFullscreenExecutor {
  private static readonly TIMEOUT = 1000;

  public static async enterFullscreen(
    element: HTMLElement,
    preferredMethod: IOSFullscreenInfo['bestMethod'] = 'native'
  ): Promise<FullscreenResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        method: 'none',
        error: '服务端环境不支持全屏',
        fallbackAvailable: true
      };
    }

    const info = IOSFullscreenDetector.detect();
    
    if (!info.isSupported) {
      return {
        success: false,
        method: 'none',
        error: '设备不支持全屏功能',
        fallbackAvailable: true
      };
    }

    const methods = this.getMethodPriority(info, preferredMethod);
    
    for (const method of methods) {
      try {
        const result = await this.executeMethod(element, method);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`全屏方法 ${method} 执行失败:`, error);
        continue;
      }
    }

    // 所有方法都失败
    return {
      success: false,
      method: methods[0] || 'none',
      error: '所有全屏方法都失败',
      fallbackAvailable: true
    };
  }

  public static async exitFullscreen(): Promise<FullscreenResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        method: 'none',
        error: '服务端环境不支持全屏',
        fallbackAvailable: true
      };
    }

    const info = IOSFullscreenDetector.detect();
    
    try {
      switch (info.bestMethod) {
        case 'native':
          if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
            return { success: true, method: 'webkitExitFullscreen', fallbackAvailable: true };
          }
          break;
          
        case 'webkit':
          if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
            return { success: true, method: 'webkitExitFullscreen', fallbackAvailable: true };
          }
          break;
          
        case 'native':
        default:
          if (document.exitFullscreen) {
            await document.exitFullscreen();
            return { success: true, method: 'exitFullscreen', fallbackAvailable: true };
          }
          if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
            return { success: true, method: 'webkitExitFullscreen', fallbackAvailable: true };
          }
          break;
      }
      
      return {
        success: false,
        method: 'unknown',
        error: '退出全屏方法不可用',
        fallbackAvailable: true
      };
    } catch (error) {
      return {
        success: false,
        method: 'exit',
        error: `退出全屏失败: ${error}`,
        fallbackAvailable: true
      };
    }
  }

  private static getMethodPriority(
    info: IOSFullscreenInfo, 
    preferred: IOSFullscreenInfo['bestMethod']
  ): string[] {
    const priorityMap = {
      native: ['showSystemUI', 'requestFullscreen', 'webkitRequestFullscreen'],
      webkit: ['webkitRequestFullscreen', 'requestFullscreen', 'showSystemUI'],
      video: ['webkitEnterFullscreen', 'webkitRequestFullscreen', 'requestFullscreen'],
      fallback: ['requestFullscreen', 'webkitRequestFullscreen', 'webkitEnterFullscreen']
    };

    return priorityMap[preferred] || priorityMap.native;
  }

  private static async executeMethod(
    element: HTMLElement, 
    method: string
  ): Promise<FullscreenResult> {
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      try {
        switch (method) {
          case 'showSystemUI':
            if ((element as any).showSystemUI) {
              (element as any).showSystemUI(false);
              resolve({ success: true, method, fallbackAvailable: true });
              return;
            }
            break;
            
          case 'webkitRequestFullscreen':
            if ((element as any).webkitRequestFullscreen) {
              (element as any).webkitRequestFullscreen();
              resolve({ success: true, method, fallbackAvailable: true });
              return;
            }
            break;
            
          case 'requestFullscreen':
            if (element.requestFullscreen) {
              element.requestFullscreen();
              resolve({ success: true, method, fallbackAvailable: true });
              return;
            }
            break;
            
          case 'webkitEnterFullscreen':
            if (element instanceof HTMLVideoElement && (element as any).webkitEnterFullscreen) {
              (element as any).webkitEnterFullscreen();
              resolve({ success: true, method, fallbackAvailable: true });
              return;
            }
            break;
        }
        
        // 方法不可用，尝试下一个
        resolve({
          success: false,
          method,
          error: `方法 ${method} 不可用`,
          fallbackAvailable: true
        });
        
      } catch (error) {
        resolve({
          success: false,
          method,
          error: `${method} 执行失败: ${error}`,
          fallbackAvailable: true
        });
      }
      
      // 超时保护
      timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          method,
          error: `${method} 执行超时`,
          fallbackAvailable: true
        });
      }, this.TIMEOUT);
    });
  }
}

// React Hook
export function useIOSFullscreenDetector(): IOSFullscreenInfo {
  const [info, setInfo] = useState<IOSFullscreenInfo>(() => IOSFullscreenDetector.detect());
  
  // 监听设备变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateInfo = () => setInfo(IOSFullscreenDetector.detect());
    
    window.addEventListener('resize', updateInfo);
    window.addEventListener('orientationchange', updateInfo);
    
    return () => {
      window.removeEventListener('resize', updateInfo);
      window.removeEventListener('orientationchange', updateInfo);
    };
  }, []);
  
  return info;
}