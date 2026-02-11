'use client';

import { AddSourceModal } from '@/components/settings/AddSourceModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PremiumSourceSettings } from '@/components/settings/PremiumSourceSettings';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { usePremiumSettingsPage } from './hooks/usePremiumSettingsPage';
import { useSafeNavigateBack } from '@/lib/hooks/useSafeNavigateBack';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function PremiumSettingsPage() {
    const {
        premiumSources,
        isAddModalOpen,
        isRestoreDefaultsDialogOpen,
        setIsAddModalOpen,
        setIsRestoreDefaultsDialogOpen,
        handleSourcesChange,
        handleAddSource,
        handleRestoreDefaults,
        editingSource,
        handleEditSource,
        setEditingSource,
    } = usePremiumSettingsPage();
    
    const { navigateBack } = useSafeNavigateBack();

    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
                {/* Custom Header for Secret Settings */}
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="secondary"
                                onClick={() => navigateBack('/premium')}
                                className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-full)]"
                                aria-label="返回"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--text-color)]">高级源设置</h1>
                                <p className="text-sm text-[var(--text-color-secondary)]">管理高级内容来源</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Source Management */}
                <PremiumSourceSettings
                    sources={premiumSources}
                    onSourcesChange={handleSourcesChange}
                    onRestoreDefaults={() => setIsRestoreDefaultsDialogOpen(true)}
                    onAddSource={() => {
                        setEditingSource(null);
                        setIsAddModalOpen(true);
                    }}
                    onEditSource={handleEditSource}
                />
            </div>

            {/* Modals */}
            <AddSourceModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingSource(null);
                }}
                onAdd={handleAddSource}
                existingIds={premiumSources.map(s => s.id)}
                initialValues={editingSource}
            />

            <ConfirmDialog
                isOpen={isRestoreDefaultsDialogOpen}
                title="恢复默认高级源"
                message="这将重置所有高级源为默认配置。自定义源将被删除。是否继续？"
                confirmText="恢复"
                cancelText="取消"
                onConfirm={handleRestoreDefaults}
                onCancel={() => setIsRestoreDefaultsDialogOpen(false)}
            />
        </div>
    );
}
