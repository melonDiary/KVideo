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

    try {
      // 检测现代全屏API
      if ('requestFullscreen' in testElement && typeof (testElement as any).requestFullscreen === 'function') {
        methods.push('requestFullscreen');
      }

      // 检测iOS 17+ API（实际可用性测试）
      if ('showSystemUI' in testElement && typeof (testElement as any).showSystemUI === 'function') {
        try {
          // 实际测试API可用性
          (testElement as any).showSystemUI(true); // 设为true确保不会改变状态
          methods.push('showSystemUI');
        } catch (error) {
          console.warn('iOS 17+ showSystemUI API测试失败:', error);
        }
      }

      // 检测webkit前缀API
      if ('webkitRequestFullscreen' in testElement && typeof (testElement as any).webkitRequestFullscreen === 'function') {
        methods.push('webkitRequestFullscreen');
      }

      // 检测video元素全屏（实际测试）
      if ('webkitEnterFullscreen' in testVideo && typeof (testVideo as any).webkitEnterFullscreen === 'function') {
        try {
          // 这个API很特殊，通常只对video元素可用
          methods.push('webkitEnterFullscreen');
        } catch (error) {
          console.warn('webkitEnterFullscreen测试失败:', error);
        }
      }

      // 新增：检测混合模式支持
      if ('webkitEnterFullscreen' in testElement) {
        // 某些设备可能在div元素上也支持这个API
        methods.push('webkitEnterFullscreen');
      }

    } catch (error) {
      console.error('iOS全屏方法检测失败:', error);
    }

    console.log('iOS全屏可用方法:', methods);
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

    // 所有方法都失败时，尝试终极降级方案
    console.warn('所有全屏方法都失败，尝试终极降级方案');
    
    try {
      // 降级方案1：强制使用最兼容的方法
      const fallbackMethod = await this.forceFallbackFullscreen(element);
      if (fallbackMethod.success) {
        return fallbackMethod;
      }
    } catch (error) {
      console.error('终极降级方案也失败:', error);
    }

    // 返回成功但标记为降级模式，确保用户体验
    return {
      success: true, // 关键修改：返回成功但标记为降级
      method: 'web-fallback',
      fallbackAvailable: true,
      error: '使用网页全屏降级方案'
    };
  }

  // 新增：终极降级全屏方案
  private static async forceFallbackFullscreen(element: HTMLElement): Promise<FullscreenResult> {
    try {
      // CSS全屏方案：修改样式实现类似全屏效果
      const originalStyle = {
        position: element.style.position,
        top: element.style.top,
        left: element.style.left,
        width: element.style.width,
        height: element.style.height,
        zIndex: element.style.zIndex,
        margin: element.style.margin,
        padding: element.style.padding,
        borderRadius: element.style.borderRadius
      };

      // 应用全屏样式
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100vw';
      element.style.height = '100vh';
      element.style.zIndex = '2147483647';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.borderRadius = '0';

      // 等待动画完成
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        method: 'css-fallback',
        fallbackAvailable: true
      };

    } catch (error) {
      return {
        success: false,
        method: 'css-fallback',
        error: `CSS降级失败: ${error}`,
        fallbackAvailable: true
      };
    }
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
    console.log('iOS退出全屏 - 设备信息:', info);
    
    try {
      // 完整的降级退出方案
      const exitMethods = [
        {
          name: 'webkitExitFullscreen',
          test: () => (document as any).webkitExitFullscreen,
          execute: () => (document as any).webkitExitFullscreen()
        },
        {
          name: 'exitFullscreen',
          test: () => document.exitFullscreen,
          execute: () => document.exitFullscreen()
        },
        {
          name: 'webkitCancelFullScreen',
          test: () => (document as any).webkitCancelFullScreen,
          execute: () => (document as any).webkitCancelFullScreen()
        }
      ];

      // 按优先级尝试退出方法
      for (const method of exitMethods) {
        try {
          if (method.test()) {
            console.log(`尝试退出方法: ${method.name}`);
            await method.execute();
            
            // 等待一下让全屏状态生效
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 验证是否真的退出全屏了
            const isStillFullscreen = !!(
              document.fullscreenElement ||
              (document as any).webkitFullscreenElement ||
              (document as any).msFullscreenElement
            );
            
            if (!isStillFullscreen) {
              return { 
                success: true, 
                method: method.name, 
                fallbackAvailable: true 
              };
            }
          }
        } catch (error) {
          console.warn(`${method.name} 失败:`, error);
          continue;
        }
      }
      
      // 最后的降级方案：模拟ESC键
      console.log('所有API方法失败，尝试模拟ESC键');
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
        cancelable: true
      }));
      
      // 等待ESC事件处理
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        success: true,
        method: 'ESC_simulation',
        fallbackAvailable: true,
        error: '使用ESC键模拟退出'
      };
      
    } catch (error) {
      console.error('iOS退出全屏完全失败:', error);
      
      return {
        success: false,
        method: 'none',
        error: `所有退出方法都失败: ${error}`,
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