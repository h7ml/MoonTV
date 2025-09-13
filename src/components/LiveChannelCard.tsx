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
}

export const LiveChannelCard: React.FC<LiveChannelCardProps> = ({
  channel,
  onPlay,
  onFavorite,
  isFavorite = false,
  showCategory = true,
  className = '',
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
