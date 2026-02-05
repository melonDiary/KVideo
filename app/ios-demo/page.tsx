/**
 * iOS视频播放器演示页面
 * 展示如何在KVideo项目中集成iOS系统播放器调用
 */

'use client';

import React, { useState } from 'react';
import {
  useIOSVideoPlayer,
  IOSVideoPlayerButton,
  IOSPlayerStatus,
  BatchVideoPlayer,
  VideoPlayerSelector
} from '../../lib/ios/react-components';
import type { VideoPlayerOptions } from '../../lib/ios/types';

export default function IOSDemoPage() {
  const { capabilities, isPlaying, lastResult, playVideo } = useIOSVideoPlayer();
  const [selectedVideo, setSelectedVideo] = useState('');
  const [customOptions, setCustomOptions] = useState<VideoPlayerOptions>({});
  const [demoVideos] = useState([
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      title: '大雄兔 (MP4)',
      options: { preferredPlayer: 'system' as const }
    },
    {
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      title: '钢铁之泪 (HLS直播流)',
      options: { preferredPlayer: 'system' as const }
    },
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'YouTube视频示例',
      options: { preferredPlayer: 'youtube' as const }
    }
  ]);

  const handleVideoSelect = (url: string) => {
    setSelectedVideo(url);
  };

  const handleCustomPlay = () => {
    if (selectedVideo) {
      playVideo(selectedVideo, customOptions);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            iOS系统播放器集成演示
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            展示如何在Web应用中调用iOS系统播放器，包括原生播放器、Safari、YouTube等
          </p>
        </div>

        {/* 设备状态显示 */}
        <div className="mb-8">
          <IOSPlayerStatus />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：基础功能演示 */}
          <div className="space-y-6">
            {/* 简单播放按钮 */}
            <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">基础播放演示</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    视频链接
                  </label>
                  <input
                    type="url"
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    placeholder="输入视频URL..."
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <IOSVideoPlayerButton
                    videoUrl={selectedVideo || 'https://example.com/video.mp4'}
                    options={{ preferredPlayer: 'auto' }}
                    showText
                  />
                  
                  <IOSVideoPlayerButton
                    videoUrl={selectedVideo || 'https://example.com/video.mp4'}
                    options={{ preferredPlayer: 'system' }}
                    variant="secondary"
                    showText
                  />
                  
                  <IOSVideoPlayerButton
                    videoUrl={selectedVideo || 'https://example.com/video.mp4'}
                    options={{ preferredPlayer: 'safari' }}
                    variant="outline"
                    showText
                  />
                </div>

                <button
                  onClick={handleCustomPlay}
                  disabled={!selectedVideo || isPlaying}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-all duration-300"
                >
                  {isPlaying ? '播放中...' : '自定义选项播放'}
                </button>
              </div>
            </div>

            {/* 播放器选择器 */}
            {selectedVideo && (
              <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">播放器选择器</h3>
                <VideoPlayerSelector
                  videoUrl={selectedVideo}
                  onPlayerSelected={(player: string, result: any) => {
                    console.log('播放器选择:', player, result);
                  }}
                />
              </div>
            )}

            {/* 自定义选项 */}
            <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">播放选项</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    首选播放器
                  </label>
                  <select
                    value={customOptions.preferredPlayer || 'auto'}
                    onChange={(e) => setCustomOptions(prev => ({
                      ...prev,
                      preferredPlayer: e.target.value as any
                    }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">智能选择</option>
                    <option value="system">系统播放器</option>
                    <option value="safari">Safari</option>
                    <option value="youtube">YouTube</option>
                    <option value="vlc">VLC</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customOptions.forceDownload || false}
                      onChange={(e) => setCustomOptions(prev => ({
                        ...prev,
                        forceDownload: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">强制下载</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customOptions.allowExternalPlayer || true}
                      onChange={(e) => setCustomOptions(prev => ({
                        ...prev,
                        allowExternalPlayer: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">允许第三方播放器</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：高级功能演示 */}
          <div className="space-y-6">
            {/* 批量播放演示 */}
            <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">批量播放演示</h3>
              <BatchVideoPlayer videos={demoVideos} />
            </div>

            {/* 功能状态 */}
            <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">功能状态</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">设备类型</span>
                  <span className="text-white">
                    {capabilities?.isIPad ? 'iPad' : 
                     capabilities?.isIPhone ? 'iPhone' : 
                     capabilities?.isIOS ? 'iOS设备' : '非iOS设备'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">iOS版本</span>
                  <span className="text-white">{capabilities?.iOSVersion || '未知'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">原生HLS</span>
                  <span className={capabilities?.hasNativeHLS ? 'text-green-400' : 'text-red-400'}>
                    {capabilities?.hasNativeHLS ? '支持' : '不支持'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">WKWebView</span>
                  <span className={capabilities?.hasWKWebView ? 'text-green-400' : 'text-red-400'}>
                    {capabilities?.hasWKWebView ? '支持' : '不支持'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">画中画</span>
                  <span className={capabilities?.supportsPictureInPicture ? 'text-green-400' : 'text-red-400'}>
                    {capabilities?.supportsPictureInPicture ? '支持' : '不支持'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">运行模式</span>
                  <span className="text-white">
                    {capabilities?.isStandalone ? 'PWA模式' : '浏览器模式'}
                  </span>
                </div>
              </div>
            </div>

            {/* 最后播放结果 */}
            {lastResult && (
              <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">最近播放结果</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">状态</span>
                    <span className={lastResult.success ? 'text-green-400' : 'text-red-400'}>
                      {lastResult.success ? '成功' : '失败'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">播放器</span>
                    <span className="text-white">{lastResult.player || '未知'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">调用方法</span>
                    <span className="text-white">{lastResult.method}</span>
                  </div>
                  
                  {lastResult.error && (
                    <div className="mt-2 p-2 bg-red-500/20 rounded-lg">
                      <span className="text-red-400 text-xs">错误: {lastResult.error}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-3">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">支持的URL格式</h4>
              <ul className="space-y-1">
                <li>• HTTP/HTTPS 视频链接 (MP4, MOV, M4V)</li>
                <li>• HLS 流媒体 (.m3u8)</li>
                <li>• YouTube 视频链接</li>
                <li>• 第三方播放器支持 (.mkv, .avi)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">功能特性</h4>
              <ul className="space-y-1">
                <li>• 智能播放器选择</li>
                <li>• iOS原生HLS支持</li>
                <li>• 自动错误回退机制</li>
                <li>• 设备能力检测</li>
                <li>• 批量播放支持</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 返回主页 */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-300 hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回主页
          </a>
        </div>
      </div>
    </div>
  );
}
