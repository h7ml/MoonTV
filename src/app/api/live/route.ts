import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

import { LiveChannelParser } from '@/lib/live-parser';

import { LiveCategory, LiveChannel, LiveSearchResult } from '@/types/live';

// Cache for live channels data
let channelsCache: LiveCategory[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getChannelsData(): Promise<LiveCategory[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (channelsCache && now - lastCacheUpdate < CACHE_TTL) {
    return channelsCache;
  }

  try {
    // Read the live channels JSON file
    const filePath = join(process.cwd(), 'live.json');
    const content = await readFile(filePath, 'utf-8');

    // Parse the JSON content
    const liveData = JSON.parse(content);
    const categories = liveData.categories || [];

    // Update cache
    channelsCache = categories;
    lastCacheUpdate = now;

    return categories;
  } catch (error) {
    // console.error('Failed to load live channels:', error);
    return channelsCache || [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'categories':
        return handleGetCategories();

      case 'channels': {
        return handleGetChannels(searchParams);
      }

      case 'search':
        return handleSearch(searchParams);

      case 'channel':
        return handleGetChannel(searchParams);

      default:
        return handleGetAll();
    }
  } catch (error) {
    // console.error('Live API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live channels' },
      { status: 500 }
    );
  }
}

async function handleGetCategories() {
  const categories = await getChannelsData();

  const categoryList = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
    channelCount: cat.channels.length,
  }));

  return NextResponse.json({ categories: categoryList });
}

async function handleGetChannels(searchParams: URLSearchParams) {
  const categories = await getChannelsData();
  const categoryId = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sort = searchParams.get('sort') || 'name';

  let allChannels: LiveChannel[] = [];

  if (categoryId) {
    const category = categories.find((cat) => cat.id === categoryId);
    if (category) {
      allChannels = category.channels;
    }
  } else {
    allChannels = categories.flatMap((cat) => cat.channels);
  }

  // Sort channels
  allChannels.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.name.localeCompare(b.name, 'zh-CN');
      case 'category':
        return a.category.localeCompare(b.category, 'zh-CN');
      case 'quality': {
        const qualityOrder = { FHD: 3, HD: 2, SD: 1 };
        return (
          (qualityOrder[b.quality || 'SD'] || 0) -
          (qualityOrder[a.quality || 'SD'] || 0)
        );
      }
      default:
        return 0;
    }
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedChannels = allChannels.slice(startIndex, endIndex);

  return NextResponse.json({
    channels: paginatedChannels,
    pagination: {
      page,
      limit,
      total: allChannels.length,
      pages: Math.ceil(allChannels.length / limit),
    },
  });
}

async function handleSearch(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  const categories = await getChannelsData();
  const query = searchParams.get('q')?.toLowerCase() || '';
  const categoryFilter = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query) {
    return NextResponse.json({
      channels: [],
      categories: [],
      totalCount: 0,
    });
  }

  let allChannels = categories.flatMap((cat) => cat.channels);

  // Filter by category if specified
  if (categoryFilter) {
    allChannels = allChannels.filter((ch) => ch.category === categoryFilter);
  }

  // Search channels
  const matchedChannels = allChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(query) ||
      channel.category.toLowerCase().includes(query) ||
      (channel.description &&
        channel.description.toLowerCase().includes(query)) ||
      (channel.tags &&
        channel.tags.some((tag) => tag.toLowerCase().includes(query)))
  );

  // Get unique categories from results
  const matchedCategories = Array.from(
    new Set(matchedChannels.map((ch) => ch.category))
  );

  // Limit results
  const limitedChannels = matchedChannels.slice(0, limit);

  const result: LiveSearchResult = {
    channels: limitedChannels,
    categories: matchedCategories,
    totalCount: matchedChannels.length,
  };

  return NextResponse.json(result);
}

async function handleGetChannel(searchParams: URLSearchParams) {
  const categories = await getChannelsData();
  const channelId = searchParams.get('id');

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
  }

  for (const category of categories) {
    const channel = category.channels.find((ch) => ch.id === channelId);
    if (channel) {
      return NextResponse.json({ channel });
    }
  }

  return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
}

async function handleGetAll() {
  const categories = await getChannelsData();

  const stats = {
    totalChannels: categories.reduce(
      (sum, cat) => sum + cat.channels.length,
      0
    ),
    totalCategories: categories.length,
    topCategories: categories
      .map((cat) => ({ category: cat.name, count: cat.channels.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };

  return NextResponse.json({
    categories,
    stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'validate':
        return handleValidateChannel(request);

      case 'refresh':
        return handleRefreshChannels();

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    // console.error('Live API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function handleValidateChannel(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const isValid = await LiveChannelParser.validateChannelUrl(url);

  return NextResponse.json({ valid: isValid });
}

async function handleRefreshChannels() {
  // Clear cache to force reload
  channelsCache = null;
  lastCacheUpdate = 0;

  // Load fresh data
  const categories = await getChannelsData();

  return NextResponse.json({
    success: true,
    message: 'Channels refreshed',
    stats: {
      categories: categories.length,
      channels: categories.reduce((sum, cat) => sum + cat.channels.length, 0),
    },
  });
}
