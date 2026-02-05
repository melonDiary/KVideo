'use client';

/**
 * PlayerSettings - Global settings for the video player
 * Following Liquid Glass design system
 */

import { Icons } from '@/components/ui/Icon';
import type { ProxyMode, IOSPlayerMode } from '@/lib/store/settings-store';
import { useIOSFullscreenDetector } from '@/lib/utils/ios-fullscreen-detector';

interface PlayerSettingsProps {
    fullscreenType: 'native' | 'window' | 'auto';
    onFullscreenTypeChange: (type: 'native' | 'window' | 'auto') => void;
    proxyMode: ProxyMode;
    onProxyModeChange: (mode: ProxyMode) => void;
    iosPlayerMode: IOSPlayerMode;
    onIOSPlayerModeChange: (mode: IOSPlayerMode) => void;
}

export function PlayerSettings({
    fullscreenType,
    onFullscreenTypeChange,
    proxyMode,
    onProxyModeChange,
    iosPlayerMode,
    onIOSPlayerModeChange,
}: PlayerSettingsProps) {
    const iosInfo = useIOSFullscreenDetector();
    
    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-color)] mb-4">播放器设置</h2>

            <div className="space-y-6">
                {/* Fullscreen Mode Selection */}
                <div>
                    <h3 className="font-medium text-[var(--text-color)] mb-2 inline-flex items-center gap-2">
                        <Icons.Maximize size={18} className="text-[var(--accent-color)]" />
                        默认全屏方式
                    </h3>
                    <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                        {iosInfo.isIOS 
                            ? `选择iOS设备上的全屏播放行为 (iOS ${iosInfo.iosVersion || '未知版本'})`
                            : '选择在桌面端点击播放器全屏按钮时的行为'
                        }
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* 智能模式 */}
                        <button
                            onClick={() => onFullscreenTypeChange('auto')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${fullscreenType === 'auto'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>🤖</span>
                                <div className="font-semibold">智能模式</div>
                            </div>
                            <div className="text-sm opacity-80 mt-1">
                                {iosInfo.isIOS 
                                    ? '自动选择最佳全屏方式' 
                                    : '自动选择最佳全屏方式'
                                }
                            </div>
                            {iosInfo.isIOS && fullscreenType === 'auto' && (
                                <div className="text-xs mt-1 opacity-70">
                                    推荐: {iosInfo.bestMethod === 'native' ? '系统全屏' : iosInfo.bestMethod === 'webkit' ? 'webkit全屏' : '网页全屏'}
                                </div>
                            )}
                        </button>
                        
                        {/* 系统全屏 */}
                        <button
                            onClick={() => onFullscreenTypeChange('native')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${fullscreenType === 'native'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>🖥️</span>
                                <div className="font-semibold">系统全屏</div>
                            </div>
                            <div className="text-sm opacity-80 mt-1">
                                {iosInfo.isIOS 
                                    ? iosInfo.bestMethod === 'native' 
                                        ? '使用最新API，完全隐藏状态栏'
                                        : '尝试使用系统全屏API'
                                    : '进入浏览器原生全屏状态'
                                }
                            </div>
                            {iosInfo.isIOS && !iosInfo.availableMethods.includes('showSystemUI') && (
                                <div className="text-xs mt-1 text-yellow-400">
                                    ⚠️ 可能无法完全隐藏状态栏
                                </div>
                            )}
                        </button>
                        
                        {/* 网页全屏 */}
                        <button
                            onClick={() => onFullscreenTypeChange('window')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${fullscreenType === 'window'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>🌐</span>
                                <div className="font-semibold">网页全屏</div>
                            </div>
                            <div className="text-sm opacity-80 mt-1">
                                {iosInfo.isIOS 
                                    ? '兼容性最好，始终可见状态栏'
                                    : '播放器填满当前浏览器窗口'
                                }
                            </div>
                            {iosInfo.isIOS && (
                                <div className="text-xs mt-1 text-green-400">
                                    ✅ 推荐给老设备
                                </div>
                            )}
                        </button>
                    </div>
                    
                    {/* iOS设备信息 */}
                    {iosInfo.isIOS && (
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-[var(--radius-xl)]">
                            <div className="flex items-start gap-3">
                                <span className="text-blue-400 text-lg">📱</span>
                                <div className="flex-1">
                                    <h4 className="font-medium text-blue-300 mb-2">iOS 设备信息</h4>
                                    <div className="text-sm text-blue-200/80 space-y-1">
                                        <div>• iOS版本: {iosInfo.iosVersion}</div>
                                        <div>• 支持方法: {iosInfo.availableMethods.join(', ') || '标准API'}</div>
                                        <div>• 最佳方式: {iosInfo.bestMethod}</div>
                                    </div>
                                    {iosInfo.recommendations.length > 0 && (
                                        <div className="mt-2 text-xs text-blue-300/70">
                                            💡 {iosInfo.recommendations[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--glass-border)]" />

                {/* Proxy Mode Selection */}
                <div>
                    <h3 className="font-medium text-[var(--text-color)] mb-2 inline-flex items-center gap-2">
                        <Icons.Globe size={18} className="text-[var(--accent-color)]" />
                        代理播放模式
                    </h3>
                    <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                        控制视频播放时的网络请求策略
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => onProxyModeChange('retry')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'retry'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">智能重试 (推荐)</div>
                            <div className="text-sm opacity-80 mt-1">直连优先，失败时尝试代理</div>
                        </button>
                        <button
                            onClick={() => onProxyModeChange('none')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'none'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">仅直连</div>
                            <div className="text-sm opacity-80 mt-1">不使用代理，失败则报错</div>
                        </button>
                        <button
                            onClick={() => onProxyModeChange('always')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'always'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">总是代理</div>
                            <div className="text-sm opacity-80 mt-1">所有请求都通过代理转发</div>
                        </button>
                    </div>
                </div>

                {/* iOS播放器设置 */}
                <div className="border-t border-[var(--glass-border)]" />
                <div>
                    <h3 className="font-medium text-[var(--text-color)] mb-2 inline-flex items-center gap-2">
                        <span className="text-[var(--accent-color)]">📱</span>
                        iOS播放器设置
                    </h3>
                    <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                        配置iOS设备上的播放器偏好设置
                    </p>
                    <div className="space-y-6">
                        {/* iOS播放器模式 */}
                        <div>
                            <div className="font-medium text-[var(--text-color)] mb-3">默认播放器模式</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <button
                                    onClick={() => onIOSPlayerModeChange('auto')}
                                    className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${iosPlayerMode === 'auto'
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🤖</span>
                                        <div className="font-semibold">智能</div>
                                    </div>
                                    <div className="text-sm opacity-80 mt-1">自动选择最佳播放器</div>
                                </button>
                                <button
                                    onClick={() => onIOSPlayerModeChange('system')}
                                    className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${iosPlayerMode === 'system'
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🖥️</span>
                                        <div className="font-semibold">系统</div>
                                    </div>
                                    <div className="text-sm opacity-80 mt-1">使用iOS原生播放器</div>
                                </button>
                                <button
                                    onClick={() => onIOSPlayerModeChange('safari')}
                                    className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${iosPlayerMode === 'safari'
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🌐</span>
                                        <div className="font-semibold">Safari</div>
                                    </div>
                                    <div className="text-sm opacity-80 mt-1">在Safari中播放</div>
                                </button>
                                <button
                                    onClick={() => onIOSPlayerModeChange('youtube')}
                                    className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${iosPlayerMode === 'youtube'
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>📺</span>
                                        <div className="font-semibold">YouTube</div>
                                    </div>
                                    <div className="text-sm opacity-80 mt-1">跳转到YouTube</div>
                                </button>
                                <button
                                    onClick={() => onIOSPlayerModeChange('vlc')}
                                    className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${iosPlayerMode === 'vlc'
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>🎬</span>
                                        <div className="font-semibold">VLC</div>
                                    </div>
                                    <div className="text-sm opacity-80 mt-1">使用VLC播放器</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
