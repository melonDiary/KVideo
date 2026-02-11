'use client';

import { useState, useEffect } from 'react';
import { IOSPlayerSelector } from '@/components/player/IOSPlayerSelector';
import { CustomVideoPlayer } from '@/components/player/CustomVideoPlayer';
import { useDeviceDetector } from '@/lib/utils/device-detector';

export default function TestIOSWebPlayer() {
  const deviceInfo = useDeviceDetector();
  const [testUrl, setTestUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [showIOSSelector, setShowIOSSelector] = useState(false);
  const [webPlayerUrl, setWebPlayerUrl] = useState('');

  // 监听网页播放器事件
  useEffect(() => {
    const handleWebPlayer = (event: any) => {
      console.log('收到网页播放器事件:', event.detail);
      setWebPlayerUrl(event.detail.url);
      setShowIOSSelector(false);
    };

    window.addEventListener('kvideo-play-web-player', handleWebPlayer);
    return () => {
      window.removeEventListener('kvideo-play-web-player', handleWebPlayer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">iOS网页播放器测试</h1>
        
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">设备信息</h2>
          <p>iOS设备: {deviceInfo.isIOS ? '是' : '否'}</p>
          <p>移动设备: {deviceInfo.isMobile ? '是' : '否'}</p>
          <p>设备类型: {deviceInfo.isIPad ? 'iPad' : deviceInfo.isIPhone ? 'iPhone' : '其他'}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">测试视频URL:</label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
            placeholder="输入视频URL"
          />
        </div>

        {!webPlayerUrl ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowIOSSelector(!showIOSSelector)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              {showIOSSelector ? '隐藏' : '显示'}iOS播放器选择器
            </button>

            {showIOSSelector && (
              <IOSPlayerSelector
                src={testUrl}
                title="测试视频"
                onIOSPlay={(result) => {
                  console.log('iOS播放器结果:', result);
                  if (result.method === 'web') {
                    console.log('切换到网页播放器');
                  }
                }}
                onIOSError={(error) => {
                  console.error('iOS播放器错误:', error);
                }}
                onBackToWeb={() => {
                  console.log('用户选择返回网页播放器');
                  setWebPlayerUrl(testUrl);
                }}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">网页播放器</h3>
              <button
                onClick={() => setWebPlayerUrl('')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                返回iOS选择器
              </button>
            </div>
            
            <CustomVideoPlayer
              src={webPlayerUrl}
              title="测试视频 - 网页播放器"
              shouldAutoPlay={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}