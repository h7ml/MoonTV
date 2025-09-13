import {
  ChevronDown,
  Filter,
  Grid,
  List,
  RefreshCw,
  Search,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';

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
  channelCount: number;
}

export const LiveChannelList: React.FC<LiveChannelListProps> = ({
  onChannelSelect,
  favorites = [],
  onToggleFavorite,
}) => {
  const [_categories, _setCategories] = useState<LiveCategory[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [_debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalChannels, setTotalChannels] = useState(0);

  // Pull to refresh state
  const [pullToRefreshOffset, setPullToRefreshOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const ITEMS_PER_PAGE = 20;
  const PULL_TO_REFRESH_THRESHOLD = 100;
  const SEARCH_DEBOUNCE_DELAY = 500;

  // Debounce search query
  const _debouncedSetSearchQuery = useDebounce((query: string) => {
    setDebouncedSearchQuery(query);
  }, SEARCH_DEBOUNCE_DELAY);

  const loadChannels = useCallback(
    async (page = 1, reset = false) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        setError(null);

        const params = new URLSearchParams({
          action: 'channels',
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
          sort: 'name',
        });

        if (selectedCategory) {
          params.append('category', selectedCategory);
        }

        if (searchQuery.trim()) {
          params.append('q', searchQuery.trim());
        }

        const response = await fetch(`/api/live?${params}`);
        if (!response.ok) {
          throw new Error('加载频道失败');
        }

        const data = await response.json();
        const newChannels = data.channels || [];
        const pagination = data.pagination || {};

        if (reset || page === 1) {
          setFilteredChannels(newChannels);
        } else {
          setFilteredChannels((prev) => [...prev, ...newChannels]);
        }

        setTotalChannels(pagination.total || 0);
        setHasMore(page < (pagination.pages || 1));
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载频道失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, searchQuery, ITEMS_PER_PAGE]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load categories for filter dropdown
      const categoriesResponse = await fetch('/api/live?action=categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategoryStats(categoriesData.categories || []);
      }

      // Load initial channels
      await loadChannels(1, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载频道失败');
    } finally {
      setLoading(false);
    }
  }, [loadChannels]);

  // Load categories and initial channels
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load more channels when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    loadChannels(1, true);
  }, [selectedCategory, searchQuery, loadChannels]);

  const refreshChannels = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/live?action=refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setCurrentPage(1);
        setHasMore(true);
        await loadChannels(1, true);
      }
    } catch (err) {
      setError('刷新频道失败');
    } finally {
      setRefreshing(false);
    }
  };

  // Load more channels for pagination
  const loadMoreChannels = useCallback(async () => {
    if (hasMore && !loadingMore && !loading) {
      await loadChannels(currentPage + 1, false);
    }
  }, [hasMore, loadingMore, loading, currentPage, loadChannels]);

  // Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 300; // Load more when 300px from bottom
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + threshold;

    if (isNearBottom) {
      loadMoreChannels();
    }
  }, [loadMoreChannels, loadingMore, hasMore]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      const offset = Math.min(diff * 0.5, PULL_TO_REFRESH_THRESHOLD * 1.5);
      setPullToRefreshOffset(offset);

      // Prevent default scroll when pulling
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      if (pullToRefreshOffset >= PULL_TO_REFRESH_THRESHOLD) {
        refreshChannels();
      }
      setPullToRefreshOffset(0);
      setIsPulling(false);
    }
  };

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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
          onClick={() => loadChannels(1, true)}
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='space-y-6 h-full overflow-y-auto'
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullToRefreshOffset}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Pull to Refresh Indicator */}
      {pullToRefreshOffset > 0 && (
        <div className='flex items-center justify-center py-4 text-gray-500 dark:text-gray-400'>
          <div
            className={`transform transition-transform ${
              pullToRefreshOffset >= PULL_TO_REFRESH_THRESHOLD
                ? 'rotate-180'
                : ''
            }`}
          >
            <ChevronDown className='w-6 h-6' />
          </div>
          <span className='ml-2 text-sm'>
            {pullToRefreshOffset >= PULL_TO_REFRESH_THRESHOLD
              ? '释放刷新'
              : '下拉刷新'}
          </span>
        </div>
      )}
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            电视直播
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>
            {loading
              ? '加载中...'
              : `共 ${totalChannels} 个频道${
                  filteredChannels.length < totalChannels
                    ? ` (显示 ${filteredChannels.length})`
                    : ''
                }`}
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={refreshChannels}
            disabled={refreshing || loading}
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
            className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
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
                {stat.name} ({stat.channelCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channel Grid/List */}
      {!loading && filteredChannels.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-500 dark:text-gray-400'>
            {searchQuery || selectedCategory
              ? '未找到匹配的频道'
              : '暂无频道数据'}
          </p>
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
        <>
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
                viewMode={viewMode}
                className={viewMode === 'list' ? '' : ''}
              />
            ))}
          </div>

          {/* Load More Button / Loading Indicator */}
          {hasMore && (
            <div className='flex justify-center py-8'>
              {loadingMore ? (
                <div className='flex items-center space-x-2'>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600'></div>
                  <span className='text-gray-600 dark:text-gray-300'>
                    加载更多...
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => loadMoreChannels()}
                  className='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors'
                >
                  加载更多频道
                </button>
              )}
            </div>
          )}

          {/* End of List Indicator */}
          {!hasMore && filteredChannels.length > 0 && (
            <div className='text-center py-8'>
              <p className='text-gray-500 dark:text-gray-400 text-sm'>
                已显示全部 {totalChannels} 个频道
              </p>
            </div>
          )}
        </>
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
                className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group'
              >
                <div className='text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400'>
                  {stat.name}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {stat.channelCount} 个频道
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
