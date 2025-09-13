import { Clock, Play, Signal, Star } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { LiveChannel } from '@/types/live';

interface LiveChannelCardProps {
  channel: LiveChannel;
  onPlay: (channel: LiveChannel) => void;
  onFavorite?: (channel: LiveChannel) => void;
  isFavorite?: boolean;
  showCategory?: boolean;
  className?: string;
  viewMode?: 'grid' | 'list';
}

export const LiveChannelCard: React.FC<LiveChannelCardProps> = ({
  channel,
  onPlay,
  onFavorite,
  isFavorite = false,
  showCategory = true,
  className = '',
  viewMode = 'grid',
}) => {
  const handlePlay = () => {
    onPlay(channel);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(channel);
    }
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'FHD':
        return 'bg-green-500';
      case 'HD':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getFormatIcon = (format?: string) => {
    switch (format) {
      case 'HLS':
        return <Signal className='w-3 h-3' />;
      case 'RTMP':
        return <Clock className='w-3 h-3' />;
      default:
        return <Signal className='w-3 h-3' />;
    }
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div
        className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 p-4 ${className}`}
        onClick={handlePlay}
      >
        <div className='flex items-center gap-4'>
          {/* Channel Logo/Thumbnail */}
          <div className='relative w-20 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden flex-shrink-0'>
            {channel.logo ? (
              <Image
                src={channel.logo}
                alt={channel.name}
                fill
                className='object-cover'
                sizes='80px'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center'>
                <div className='text-white font-bold text-sm text-center'>
                  {channel.name.substring(0, 2)}
                </div>
              </div>
            )}

            {/* Quality Badge */}
            {channel.quality && (
              <div
                className={`absolute -top-1 -right-1 ${getQualityColor(
                  channel.quality
                )} text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-medium`}
              >
                {channel.quality}
              </div>
            )}
          </div>

          {/* Channel Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between mb-1'>
              <h3 className='font-semibold text-gray-900 dark:text-white truncate text-lg'>
                {channel.name}
              </h3>

              <div className='flex items-center gap-2 ml-3 flex-shrink-0'>
                {/* Play Button */}
                <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                  <div className='bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors'>
                    <Play className='w-4 h-4 ml-0.5' fill='currentColor' />
                  </div>
                </div>

                {/* Favorite Button */}
                {onFavorite && (
                  <button
                    onClick={handleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <Star
                      className='w-4 h-4'
                      fill={isFavorite ? 'currentColor' : 'none'}
                    />
                  </button>
                )}
              </div>
            </div>

            <div className='flex items-center gap-3 mb-2'>
              {showCategory && (
                <span className='text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
                  {channel.category}
                </span>
              )}

              {channel.urls.length > 1 && (
                <span className='text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded'>
                  {channel.urls.length} 源
                </span>
              )}

              <div className='flex items-center gap-1 text-gray-500'>
                {getFormatIcon(channel.format)}
                <span className='text-xs'>{channel.format}</span>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {channel.language && (
                  <span className='text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded'>
                    {channel.language}
                  </span>
                )}
                {channel.country && (
                  <span className='text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded'>
                    {channel.country}
                  </span>
                )}
              </div>

              <div className='flex items-center gap-2'>
                <span className='text-xs text-gray-500'>
                  {channel.isActive ? '在线' : '离线'}
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    channel.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view layout (original)
  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 ${className}`}
      onClick={handlePlay}
    >
      {/* Channel Logo/Thumbnail */}
      <div className='relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden'>
        {channel.logo ? (
          <Image
            src={channel.logo}
            alt={channel.name}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <div className='text-white font-bold text-lg text-center px-4'>
              {channel.name.substring(0, 2)}
            </div>
          </div>
        )}

        {/* Play Button Overlay */}
        <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center'>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <div className='bg-white bg-opacity-90 rounded-full p-3'>
              <Play
                className='w-6 h-6 text-gray-900 ml-0.5'
                fill='currentColor'
              />
            </div>
          </div>
        </div>

        {/* Quality Badge */}
        {channel.quality && (
          <div
            className={`absolute top-2 left-2 ${getQualityColor(
              channel.quality
            )} text-white text-xs px-2 py-1 rounded`}
          >
            {channel.quality}
          </div>
        )}

        {/* Favorite Button */}
        {onFavorite && (
          <button
            onClick={handleFavorite}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
              isFavorite
                ? 'bg-yellow-500 text-white'
                : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
            }`}
          >
            <Star
              className='w-4 h-4'
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        )}

        {/* Format Icon */}
        <div className='absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded'>
          {getFormatIcon(channel.format)}
        </div>
      </div>

      {/* Channel Info */}
      <div className='p-3'>
        <div className='flex items-start justify-between mb-2'>
          <h3 className='font-semibold text-gray-900 dark:text-white truncate flex-1'>
            {channel.name}
          </h3>
          {channel.urls.length > 1 && (
            <span className='text-xs text-gray-500 ml-2 flex-shrink-0'>
              {channel.urls.length} 源
            </span>
          )}
        </div>

        {showCategory && (
          <p className='text-sm text-gray-600 dark:text-gray-300 truncate mb-2'>
            {channel.category}
          </p>
        )}

        {channel.description && (
          <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-2'>
            {channel.description}
          </p>
        )}

        {/* Channel Stats */}
        <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700'>
          <div className='flex items-center space-x-2'>
            {channel.language && (
              <span className='text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded'>
                {channel.language}
              </span>
            )}
            {channel.country && (
              <span className='text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded'>
                {channel.country}
              </span>
            )}
          </div>

          <div
            className={`w-2 h-2 rounded-full ${
              channel.isActive ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
