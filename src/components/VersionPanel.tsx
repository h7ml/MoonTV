/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { Bug, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { changelog, ChangelogEntry } from '@/lib/changelog';
import { CURRENT_VERSION } from '@/lib/version';

interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionPanel: React.FC<VersionPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 渲染变更日志条目
  const renderChangelogEntry = (
    entry: ChangelogEntry,
    isCurrentVersion = false
  ) => {
    return (
      <div
        key={entry.version}
        className={`p-4 rounded-lg border ${
          isCurrentVersion
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* 版本标题 */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              v{entry.version}
            </h4>
            {isCurrentVersion && (
              <span className='px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full'>
                当前版本
              </span>
            )}
          </div>
          <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
            {entry.date}
          </div>
        </div>

        {/* 变更内容 */}
        <div className='space-y-3'>
          {entry.added.length > 0 && (
            <div>
              <h5 className='text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1'>
                <Plus className='w-4 h-4' />
                新增功能
              </h5>
              <ul className='space-y-1'>
                {entry.added.map((item, index) => (
                  <li
                    key={index}
                    className='text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2'
                  >
                    <span className='w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.changed.length > 0 && (
            <div>
              <h5 className='text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1'>
                <RefreshCw className='w-4 h-4' />
                功能改进
              </h5>
              <ul className='space-y-1'>
                {entry.changed.map((item, index) => (
                  <li
                    key={index}
                    className='text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2'
                  >
                    <span className='w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.fixed.length > 0 && (
            <div>
              <h5 className='text-sm font-medium text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1'>
                <Bug className='w-4 h-4' />
                问题修复
              </h5>
              <ul className='space-y-1'>
                {entry.fixed.map((item, index) => (
                  <li
                    key={index}
                    className='text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2'
                  >
                    <span className='w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 版本面板内容
  const versionPanelContent = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={onClose}
      />

      {/* 版本面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] overflow-hidden'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <h3 className='text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200'>
              版本信息
            </h3>
            <span className='px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full'>
              v{CURRENT_VERSION}
            </span>
          </div>
          <button
            onClick={onClose}
            className='w-6 h-6 sm:w-8 sm:h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            aria-label='关闭'
          >
            <X className='w-full h-full' />
          </button>
        </div>

        {/* 内容区域 */}
        <div className='p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-120px)]'>
          <div className='space-y-3 sm:space-y-6'>
            {/* 变更日志标题 */}
            <div className='border-b border-gray-200 dark:border-gray-700 pb-4'>
              <h4 className='text-lg font-semibold text-gray-800 dark:text-gray-200 pb-3 sm:pb-4'>
                变更日志
              </h4>

              <div className='space-y-4'>
                {/* 本地变更日志 */}
                {changelog.map((entry) =>
                  renderChangelogEntry(entry, entry.version === CURRENT_VERSION)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 使用 Portal 渲染到 document.body
  if (!mounted || !isOpen) return null;

  return createPortal(versionPanelContent, document.body);
};
