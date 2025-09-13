'use client';

// Force dynamic rendering to prevent static generation issues with localStorage
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { LiveChannelList } from '@/components/LiveChannelList';
import PageLayout from '@/components/PageLayout';

import { LiveChannel } from '@/types/live';

export default function LivePage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('live-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('live-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleChannelSelect = (channel: LiveChannel) => {
    // Navigate to live player page
    const params = new URLSearchParams({
      id: channel.id,
      name: channel.name,
      urls: channel.urls.join(','),
      category: channel.category,
      quality: channel.quality || 'SD',
      format: channel.format || 'HLS',
    });

    router.push(`/live/play?${params.toString()}`);
  };

  const handleToggleFavorite = (channel: LiveChannel) => {
    setFavorites((prev) => {
      const isCurrentlyFavorite = prev.includes(channel.id);
      if (isCurrentlyFavorite) {
        return prev.filter((id) => id !== channel.id);
      } else {
        return [...prev, channel.id];
      }
    });
  };

  return (
    <PageLayout>
      <div className='p-4 sm:p-6 lg:p-8'>
        <LiveChannelList
          onChannelSelect={handleChannelSelect}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </PageLayout>
  );
}
