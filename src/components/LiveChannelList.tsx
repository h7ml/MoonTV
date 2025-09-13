import { Filter, Grid, List, RefreshCw, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { LiveChannelCard } from './LiveChannelCard';

import { LiveCategory, LiveChannel } from '@/types/live';

interface LiveChannelListProps {
  onChannelSelect: (channel: LiveChannel) => void;
  favorites?: string[];
  onToggleFavorite?: (channel: LiveChannel) => void;
}

interface CategoryStats {
  id: string;
  name: string;
  count: number;
}

export const LiveChannelList: React.FC<LiveChannelListProps> = ({
  onChannelSelect,
  favorites = [],
  onToggleFavorite,
}) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  // Load categories and channels
  useEffect(() => {
    loadChannels();
  }, []);

  // Filter channels based on search and category
  useEffect(() => {
    let channels = categories.flatMap((cat) => cat.channels);

    if (selectedCategory) {
      channels = channels.filter((ch) => ch.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      channels = channels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(query) ||
          ch.category.toLowerCase().includes(query)
      );
    }

    setFilteredChannels(channels);
  }, [categories, selectedCategory, searchQuery]);

  // Update category stats
  useEffect(() => {
    const stats = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: cat.channels.length,
    }));
    setCategoryStats(stats);
  }, [categories]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/live');
      if (!response.ok) {
        throw new Error('加载频道失败');
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载频道失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshChannels = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      });

      if (response.ok) {
        await loadChannels();
      }
    } catch (err) {
      setError('刷新频道失败');
    } finally {
      setRefreshing(false);
    }
  };

  const processChannelUrls = (channel: LiveChannel): LiveChannel => {
    // 如果当前页面是 HTTP 访问，处理 HTTPS 直播源
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      const processedUrls = channel.urls.map((url) => {
        if (url.startsWith('https://')) {
          try {
            const urlObj = new URL(url);
            const host = urlObj.host;
            const pathname = urlObj.pathname;
            const search = urlObj.search;
            return `/proxy/${host}${pathname}${search}`;
          } catch {
            return url; // 如果 URL 解析失败，返回原始 URL
          }
        }
        return url;
      });

      return {
        ...channel,
        urls: processedUrls,
      };
    }

    return channel;
  };

  const handleChannelPlay = (channel: LiveChannel) => {
    const processedChannel = processChannelUrls(channel);
    onChannelSelect(processedChannel);
  };

  const handleToggleFavorite = (channel: LiveChannel) => {
    if (onToggleFavorite) {
      onToggleFavorite(channel);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-3 text-gray-600 dark:text-gray-300'>
          加载频道中...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-12'>
        <p className='text-red-600 dark:text-red-400 mb-4'>{error}</p>
        <button
          onClick={loadChannels}
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            电视直播
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>
            共 {filteredChannels.length} 个频道
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={refreshChannels}
            disabled={refreshing}
            className='p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50'
            title='刷新频道'
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>

          <div className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Grid className='w-4 h-4' />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <List className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        {/* Search */}
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
          <input
            type='text'
            placeholder='搜索频道...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>

        {/* Category Filter */}
        <div className='relative'>
          <Filter className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className='pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer'
          >
            <option value=''>全部分类</option>
            {categoryStats.map((stat) => (
              <option key={stat.id} value={stat.name}>
                {stat.name} ({stat.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channel Grid/List */}
      {filteredChannels.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-500 dark:text-gray-400'>未找到匹配的频道</p>
          {(searchQuery || selectedCategory) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
              }}
              className='mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
            >
              清除筛选条件
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          }
        >
          {filteredChannels.map((channel) => (
            <LiveChannelCard
              key={channel.id}
              channel={channel}
              onPlay={handleChannelPlay}
              onFavorite={handleToggleFavorite}
              isFavorite={favorites.includes(channel.id)}
              showCategory={!selectedCategory}
              className={
                viewMode === 'list'
                  ? 'flex flex-row items-center space-x-4'
                  : ''
              }
            />
          ))}
        </div>
      )}

      {/* Category Statistics */}
      {!searchQuery && !selectedCategory && categoryStats.length > 0 && (
        <div className='mt-8 pt-8 border-t border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            频道分类
          </h3>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
            {categoryStats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setSelectedCategory(stat.name)}
                className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left'
              >
                <div className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                  {stat.name}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {stat.count} 个频道
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
