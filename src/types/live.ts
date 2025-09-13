export interface LiveChannel {
  id: string;
  name: string;
  urls: string[];
  category: string;
  logo?: string;
  description?: string;
  tags?: string[];
  quality?: 'HD' | 'FHD' | 'SD';
  language?: string;
  country?: string;
  isActive?: boolean;
  sortOrder?: number;
  lastTested?: Date;
  avgBitrate?: number;
  codec?: string;
  format?: 'HLS' | 'DASH' | 'FLV' | 'RTMP';
}

export interface LiveCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  channels: LiveChannel[];
}

export interface LivePlaylistItem {
  name: string;
  url: string;
  category?: string;
  logo?: string;
}

export interface LiveStreamQuality {
  label: string;
  url: string;
  bitrate?: number;
  resolution?: string;
}

export interface LiveStreamMetadata {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  isLive: boolean;
  viewers?: number;
  qualities: LiveStreamQuality[];
}

export interface LiveSourceConfig {
  id: string;
  name: string;
  description?: string;
  url?: string;
  type: 'file' | 'url' | 'api';
  format: 'm3u' | 'm3u8' | 'json' | 'xml' | 'txt' | 'auto';
  enabled: boolean;
  refreshInterval?: number;
  lastUpdate?: Date;
  channelCount?: number;
  categories?: string[];
}

export interface LivePlayerState {
  channel?: LiveChannel;
  isPlaying: boolean;
  isLoading: boolean;
  error?: string;
  volume: number;
  isMuted: boolean;
  currentQuality?: string;
  availableQualities: LiveStreamQuality[];
}

export interface LiveChannelHistory {
  channelId: string;
  watchedAt: Date;
  duration: number;
}

export interface LiveFavorite {
  channelId: string;
  addedAt: Date;
  category?: string;
  customName?: string;
}

export interface LiveEPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  rating?: string;
  thumbnail?: string;
}

export interface LiveEPGChannel {
  channelId: string;
  programs: LiveEPGProgram[];
}

export interface LiveSearchResult {
  channels: LiveChannel[];
  categories: string[];
  totalCount: number;
}

export interface LiveStats {
  totalChannels: number;
  totalCategories: number;
  favoriteCount: number;
  recentlyWatched: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
}